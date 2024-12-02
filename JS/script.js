document.addEventListener("DOMContentLoaded", () => {
    const menuMap = new Map();
    const completedComandes = JSON.parse(localStorage.getItem('completedComandes')) || [];

    fetch("https://apic.clickeat.cat/menus")
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

            return fetch("https://apic.clickeat.cat/comandes");
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la solicitud de comandas: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Dades de comandes:", data);

            const comandesDiv = document.getElementById('comandes');
            if (!comandesDiv) {
                console.error("No s'ha trobat el div #comandes");
                return;
            }

            comandesDiv.innerHTML = "";

            const filteredData = data.filter(item => 
                item.Estat === "En Proces" && !completedComandes.includes(item.ComandaID)
            );

            const groupedByFactura = filteredData.reduce((acc, item) => {
                const facturaID = item.FacturaID;
                if (!acc[facturaID]) {
                    acc[facturaID] = [];
                }
                acc[facturaID].push(item);
                return acc;
            }, {});

            Object.keys(groupedByFactura).forEach(facturaID => {
                const comandaGroup = groupedByFactura[facturaID];
                const menuNames = comandaGroup.map(item => {
                    return item.MenuID ? menuMap.get(item.MenuID) || `ID: ${item.MenuID} desconocido` : '';
                }).join(', '); 
                const taula = comandaGroup[0].Taula;

                let startTime = localStorage.getItem(`startTime-${facturaID}`);
                if (!startTime) {
                    startTime = Date.now();
                    localStorage.setItem(`startTime-${facturaID}`, startTime);
                } else {
                    startTime = parseInt(startTime, 10);
                }

                const platoDiv = document.createElement('div');
                platoDiv.className = 'plato-carta';
                platoDiv.setAttribute('data-factura-id', facturaID);
                
                if (taula!=null) {
                    platoDiv.innerHTML = `
                        <h4>Factura ID: ${facturaID}</h4>
                        <p class="menuID">Menú(s): <span id="menu-${facturaID}">${menuNames}</span></p>
                        <p class="taula">Taula: <span id="taula-${facturaID}">${taula}</span></p>
                        <p class="temps-transcurregut">Temps transcurrut: <span id="temps-${facturaID}">00:00:00</span></p>
                    `;
                } else {
                    platoDiv.innerHTML = `
                        <h4>Factura ID: ${facturaID}</h4>
                        <p class="menuID">Menú(s): <span id="menu-${facturaID}">${menuNames}</span></p>
                        <p class="temps-transcurregut">Temps transcurrut: <span id="temps-${facturaID}">00:00:00</span></p>
                    `;
                }

                comandesDiv.appendChild(platoDiv);

                const interval = setInterval(() => {
                    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                    const formattedTime = formatTime(elapsedTime);
                    document.getElementById(`temps-${facturaID}`).innerText = formattedTime;
                    localStorage.setItem(`startTime-${facturaID}`, startTime);
                }, 1000);

                platoDiv.addEventListener('click', function () {
                    comandaGroup.forEach(item => {
                        completedComandes.push(item.ComandaID); 
                    });
                    localStorage.setItem('completedComandes', JSON.stringify(completedComandes));
                    
                    fetch('https://apic.clickeat.cat/comanda/completar', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ComandaID: facturaID }) 
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Error al completar la comanda: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log(data.message);
                        platoDiv.innerHTML += `<p>Factura completada</p>`;
                        platoDiv.remove();
                        clearInterval(interval);
                        localStorage.removeItem(`startTime-${facturaID}`);
                    })
                    .catch(error => {
                        console.error("Error al completar la comanda:", error);
                        error.response?.text().then(errorText => {
                            console.error("Detalles del error del servidor:", errorText);
                        });
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
