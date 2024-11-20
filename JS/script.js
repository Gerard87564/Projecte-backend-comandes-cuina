document.addEventListener("DOMContentLoaded", () => {
    fetch("https://api.clickeat.cat/comandes")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const comandesDiv = document.getElementById('comandes');
            if (!comandesDiv) {
                console.error("No se encontró el contenedor #comandes");
                return;
            }

            comandesDiv.innerHTML = "";

            const filteredData = data.filter(item => item.Estat === "En Proces");

            filteredData.forEach((item, index) => {
                const ComandaID = item.ComandaID;
                const Nombre = item.Estat;
                let TempsRestant = item.TempsRestant;

                if (!TempsRestant || isNaN(TempsRestant)) {
                    console.warn("Elemento omitido por falta de TempsRestant válido:", item);
                    return;
                }

                const platoDiv = document.createElement('div');
                platoDiv.className = 'plato-carta';
                platoDiv.setAttribute('data-menu-id', ComandaID);

                platoDiv.innerHTML = `
                    <h4>${Nombre}</h4>
                    <p class="temps-restant">Tiempo restante: <span id="temps-${index}">${formatTime(TempsRestant)}</span></p>
                `;

                comandesDiv.appendChild(platoDiv);

                setInterval(() => {
                    if (TempsRestant > 0) {
                        TempsRestant -= 1;
                        document.getElementById(`temps-${index}`).innerText = formatTime(TempsRestant);
                    } else if(TempsRestant <= 0) {
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

                        platoDiv.innerHTML += `<p>Comanda completada</p>`;
                        platoDiv.remove();
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