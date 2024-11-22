document.addEventListener("DOMContentLoaded", () => {
    const menuMap = new Map();
    const completedComandes = JSON.parse(localStorage.getItem('completedComandes')) || [];

    fetch("https://api.clickeat.cat/menus")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al cargar menús: ${response.status}`);
            }
            return response.json();
        })
        .then(menus => {
            console.log("Datos de menús:", menus);

            menus.forEach(menu => {
                menuMap.set(menu.MenuID, menu.Nombre);
            });

            console.log("Contenido de menuMap:", Array.from(menuMap.entries()));

            return fetch("https://api.clickeat.cat/comandes");
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la solicitud de comandas: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Datos de comandas:", data);

            const comandesDiv = document.getElementById('comandes');
            if (!comandesDiv) {
                console.error("No se encontró el contenedor #comandes");
                return;
            }

            comandesDiv.innerHTML = "";

            const filteredData = data.filter(item => 
                item.Estat === "En Proces" && !completedComandes.includes(item.ComandaID)
            );

            filteredData.forEach((item, index) => {
                console.log("Elemento procesado:", item);

                const ComandaID = item.ComandaID;
                const idmenu = item.MenuID;

                if (!idmenu) {
                    console.error(`El campo MenuID no está definido en el item:`, item);
                }

                const menuNombre = menuMap.get(idmenu) || `ID: ${idmenu} desconocido`;

                let TempsRestant = item.TempsRestant;

                const savedTime = localStorage.getItem(`TempsRestant-${ComandaID}`);
                if (savedTime) {
                    TempsRestant = parseInt(savedTime, 10);
                }

                if (isNaN(TempsRestant) || TempsRestant <= 0) {
                    console.warn("Elemento omitido por falta de TempsRestant válido:", item);
                    return;
                }

                const platoDiv = document.createElement('div');
                platoDiv.className = 'plato-carta';
                platoDiv.setAttribute('data-menu-id', ComandaID);
                
                if (item.Taula!=undefined) {
                    platoDiv.innerHTML = `
                        <h4>${item.Estat}</h4>
                        <p class="comandaID">ComandaID: <span id="comanda-${index}">${ComandaID}</span></p>
                        <p class="menuID">Menú: <span id="menu-${index}">${menuNombre}</span></p>
                        <p class="menuID">Taula: <span id="taula-${index}">${item.Taula}</span></p>
                        <p class="temps-restant">Tiempo restante: <span id="temps-${index}">${formatTime(TempsRestant)}</span></p>
                    `;       
                } else {
                    platoDiv.innerHTML = `
                        <h4>${item.Estat}</h4>
                        <p class="comandaID">ComandaID: <span id="comanda-${index}">${ComandaID}</span></p>
                        <p class="menuID">Menú: <span id="menu-${index}">${menuNombre}</span></p>
                        <p class="temps-restant">Tiempo restante: <span id="temps-${index}">${formatTime(TempsRestant)}</span></p>
                    `;  
                }

                platoDiv.addEventListener('click', function () {
                    completedComandes.push(ComandaID);
                    localStorage.setItem('completedComandes', JSON.stringify(completedComandes));

                    fetch('https://api.clickeat.cat/comanda/completar', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ comandaId: ComandaID })
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Error al completar la comanda: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log(data.message);
                        platoDiv.innerHTML += `<p>Comanda completada</p>`;
                        platoDiv.remove();
                        clearInterval(interval);
                        localStorage.removeItem(`TempsRestant-${ComandaID}`);
                    })
                    .catch(error => {
                        console.error("Error al completar la comanda:", error);
                    });
                });

                comandesDiv.appendChild(platoDiv);

                const interval = setInterval(() => {
                    if (TempsRestant > 0) {
                        TempsRestant -= 1;
                        document.getElementById(`temps-${index}`).innerText = formatTime(TempsRestant);

                        localStorage.setItem(`TempsRestant-${ComandaID}`, TempsRestant);
                    } else if (TempsRestant <= 0) {
                        fetch('https://api.clickeat.cat/comanda/completar', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ comandaId: ComandaID })
                        })
                        .then(response => response.json())
                        .then(data => {
                            console.log(data.message);
                        })
                        .catch(error => {
                            console.error("Error al actualizar la comanda:", error);
                        });

                        completedComandes.push(ComandaID);
                        localStorage.setItem('completedComandes', JSON.stringify(completedComandes));

                        platoDiv.innerHTML += `<p>Comanda completada</p>`;
                        platoDiv.remove();
                        clearInterval(interval);

                        localStorage.removeItem(`TempsRestant-${ComandaID}`);
                    }
                }, 60000);
            });
        })
        .catch(error => {
            console.error("Error al cargar los datos o procesarlos:", error);
        });
});

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}