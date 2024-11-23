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

                let startTime = localStorage.getItem(`startTime-${ComandaID}`);
                if (!startTime) {
                    startTime = Date.now();
                    localStorage.setItem(`startTime-${ComandaID}`, startTime);
                } else {
                    startTime = parseInt(startTime, 10); 
                }

                const platoDiv = document.createElement('div');
                platoDiv.className = 'plato-carta';
                platoDiv.setAttribute('data-menu-id', ComandaID);
                
                if (item.Taula != undefined) {
                    platoDiv.innerHTML = `
                        <h4>${item.Estat}</h4>
                        <p class="comandaID">ComandaID: <span id="comanda-${index}">${ComandaID}</span></p>
                        <p class="menuID">Menú: <span id="menu-${index}">${menuNombre}</span></p>
                        <p class="menuID">Taula: <span id="taula-${index}">${item.Taula}</span></p>
                        <p class="temps-transcurregut">Tiempo transcurregut: <span id="temps-${index}">00:00:00</span></p>
                    `;       
                } else {
                    platoDiv.innerHTML = `
                        <h4>${item.Estat}</h4>
                        <p class="comandaID">ComandaID: <span id="comanda-${index}">${ComandaID}</span></p>
                        <p class="menuID">Menú: <span id="menu-${index}">${menuNombre}</span></p>
                        <p class="temps-transcurregut">Tiempo transcurregut: <span id="temps-${index}">00:00:00</span></p>
                    `;  
                }

                comandesDiv.appendChild(platoDiv);

                const interval = setInterval(() => {
                    const elapsedTime = Math.floor((Date.now() - startTime) / 1000); 
                    const formattedTime = formatTime(elapsedTime); 

                    document.getElementById(`temps-${index}`).innerText = formattedTime;

                    localStorage.setItem(`startTime-${ComandaID}`, startTime); 
                }, 1000); 

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
                        localStorage.removeItem(`startTime-${ComandaID}`);
                    })
                    .catch(error => {
                        console.error("Error al completar la comanda:", error);
                    });
                });
            });
        })
        .catch(error => {
            console.error("Error al cargar los datos o procesarlos:", error);
        });
});

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600); 
    const minutes = Math.floor((seconds % 3600) / 60); 
    const remainingSeconds = seconds % 60; 
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
