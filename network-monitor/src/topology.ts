import * as fbTopology from "./generated/topology";

export let peers: PeerList = {};

interface PeerList {
  [id: string]: Peer;
}

interface Peer {
  id: string;
  currentLocation: number;
  connectionTimestamp: number;
  connections: Connection[];
  history: ChangeInfo[];
  locationHistory: { location: number; timestamp: number }[];
}

interface Connection {
  id: string;
  location: number;
}

interface ChangeInfo {
  type: "Added" | "Removed";
  from: Connection;
  to: Connection;
  timestamp: number;
}

export function handleChange(peerChange: fbTopology.PeerChange) {
  try {
    const unpacked = peerChange.unpack();
    switch (unpacked.changeType) {
      case fbTopology.PeerChangeType.AddedConnection:
        handleAddedConnection(unpacked.change as fbTopology.AddedConnectionT);
        break;
      case fbTopology.PeerChangeType.RemovedConnection:
        handleRemovedConnection(
          unpacked.change as fbTopology.RemovedConnectionT
        );
        break;
      case fbTopology.PeerChangeType.NONE:
        break;
      case fbTopology.PeerChangeType.Error:
        const error = unpacked.change as fbTopology.ErrorT;
        if (error.message) {
          console.error(error.message);
        }
        break;
    }
    unpacked.currentState.forEach((connection) => {
      handleAddedConnection(connection);
    });
  } catch (e) {
    console.error(e);
  } finally {
    updateTable();
  }
}

export function handleAddedConnection(peerChange: fbTopology.AddedConnectionT) {
  const added = peerChange;
  const fromAdded = added.from!.toString();
  const toAdded = added.to!.toString();

  const fromConnection: Connection = {
    id: fromAdded,
    location: added.fromLocation,
  };

  const toConnection: Connection = {
    id: toAdded,
    location: added.toLocation,
  };

  if (peers[fromAdded]) {
    if (peers[fromAdded].currentLocation !== added.fromLocation) {
      peers[fromAdded].locationHistory.push({
        location: peers[fromAdded].currentLocation,
        timestamp: Date.now(),
      });
      peers[fromAdded].currentLocation = added.fromLocation;
    }

    if (!peers[fromAdded].connections.some((conn) => conn.id === toAdded)) {
      peers[fromAdded].connections.push(toConnection);
    }
  } else {
    peers[fromAdded] = {
      id: fromAdded,
      currentLocation: added.fromLocation,
      connectionTimestamp: Date.now(),
      connections: [toConnection],
      history: [],
      locationHistory: [],
    };
  }

  if (peers[toAdded]) {
    if (peers[toAdded].currentLocation !== added.toLocation) {
      peers[toAdded].locationHistory.push({
        location: peers[toAdded].currentLocation,
        timestamp: Date.now(),
      });
      peers[toAdded].currentLocation = added.toLocation;
    }

    if (!peers[toAdded].connections.some((conn) => conn.id === fromAdded)) {
      peers[toAdded].connections.push(toConnection);
    }
  } else {
    peers[toAdded] = {
      id: toAdded,
      currentLocation: added.toLocation,
      connectionTimestamp: Date.now(),
      connections: [fromConnection],
      history: [],
      locationHistory: [],
    };
  }

  const changeInfo: ChangeInfo = {
    type: "Added",
    from: fromConnection,
    to: toConnection,
    timestamp: Date.now(),
  };

  peers[fromAdded].history.push(changeInfo);
  peers[toAdded].history.push(changeInfo);
}

export function handleRemovedConnection(
  peerChange: fbTopology.RemovedConnectionT
) {
  const removed = peerChange;
  const fromRemoved = removed.from!.toString();
  const atRemoved = removed.at!.toString();
  const index = peers[fromRemoved].connections.findIndex(
    (connection) => connection.id === atRemoved
  );

  if (index > -1) {
    peers[fromRemoved].connections.splice(index, 1);
  }

  const reverseIndex = peers[atRemoved].connections.findIndex(
    (connection: Connection) => connection.id === fromRemoved
  );

  if (reverseIndex > -1) {
    peers[atRemoved].connections.splice(reverseIndex, 1);
  }

  const changeInfo: ChangeInfo = {
    type: "Removed",
    from: {
      id: fromRemoved,
      location: peers[fromRemoved].currentLocation,
    },
    to: {
      id: atRemoved,
      location: peers[atRemoved].currentLocation,
    },
    timestamp: Date.now(),
  };

  peers[fromRemoved].history.push(changeInfo);
  peers[atRemoved].history.push(changeInfo);
}

function updateTable() {
  const peerConnectionsDiv = document.getElementById("peer-connections")!;

  const table = document.getElementById("peers-table")!;

  const tbody = table.querySelector("tbody")!;
  tbody.innerHTML = "";

  const setDivPosition = (event: MouseEvent) => {
    peerConnectionsDiv.style.display = "block";
    const rect = peerConnectionsDiv.offsetParent!.getBoundingClientRect();
    const divHeight = peerConnectionsDiv.offsetHeight;

    // Check if the div would render off the bottom of the screen
    if (event.clientY + divHeight > window.innerHeight) {
      // If so, position it above the mouse cursor instead
      peerConnectionsDiv.style.top = `${
        event.clientY - rect.top - divHeight
      }px`;
    } else {
      // Otherwise, position it below the mouse cursor as usual
      peerConnectionsDiv.style.top = `${event.clientY - rect.top}px`;
    }

    peerConnectionsDiv.style.left = `${event.clientX - rect.left + 15}px`;
  };

  for (const peer in peers) {
    const peerData = peers[peer];
    const row = document.createElement("tr");
    row.addEventListener("mouseover", (event) => {
      setDivPosition(event);
      showConnections(peers[peer]);
    });
    row.addEventListener("mousemove", (event) => {
      setDivPosition(event);
    });
    row.addEventListener(
      "mouseout",
      () => (peerConnectionsDiv.style.display = "none")
    );

    const id = document.createElement("td");
    id.textContent = peerData.id;
    const location = document.createElement("td");
    location.textContent = peerData.currentLocation.toString();
    const connectionTimestamp = document.createElement("td");
    const timestamp = new Date(peerData.connectionTimestamp);
    connectionTimestamp.textContent = `${timestamp.toUTCString()} (${timestamp.getMilliseconds()}ms)`;
    row.appendChild(id);
    row.appendChild(location);
    row.appendChild(connectionTimestamp);

    // Add event listeners to each td element
    const tds = row.getElementsByTagName("td");
    for (let i = 0; i < tds.length; i++) {
      tds[i].addEventListener("mouseover", (event) => {
        setDivPosition(event);
        showConnections(peers[peer]);
      });
      row.addEventListener("mousemove", (event) => {
        setDivPosition(event);
      });
      tds[i].addEventListener(
        "mouseout",
        () => (peerConnectionsDiv.style.display = "none")
      );
    }

    tbody.appendChild(row);
  }

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const sortedRows = rows.sort((a, b) => {
    const cellA = a.cells[1].textContent!;
    const cellB = b.cells[1].textContent!;
    return cellA.localeCompare(cellB);
  });

  rows.forEach((row) => tbody.removeChild(row));
  sortedRows.forEach((row) => tbody.appendChild(row));
}

const sortDirections: number[] = [];

document
  .querySelector("#peers-table-h")!
  .querySelectorAll("th")!
  .forEach((header, index) => {
    sortDirections.push(1);
    tableSorting(header, index);
  });

function tableSorting(header: HTMLTableCellElement, index: number) {
  header.addEventListener("click", () => {
    const tbody =
      header.parentElement!.parentElement!.parentElement!.querySelector(
        "tbody"
      )!;
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const sortedRows = rows.sort((a, b) => {
      const cellA = a.cells[index].textContent!;
      const cellB = b.cells[index].textContent!;

      // Use a locale-sensitive string comparison for proper sorting
      // Multiply by the sort direction to toggle between ascending and descending order
      return cellA.localeCompare(cellB) * sortDirections[index];
    });

    // Toggle the sort direction for the next click
    sortDirections[index] = -sortDirections[index];
    const icon = header.querySelector("i")!;
    if (icon.classList.contains("fa-sort-amount-down")) {
      icon.classList.remove("fa-sort-amount-down");
      icon.classList.add("fa-sort-amount-up");
    } else {
      icon.classList.remove("fa-sort-amount-up");
      icon.classList.add("fa-sort-amount-down");
    }

    rows.forEach((row) => tbody.removeChild(row));
    sortedRows.forEach((row) => tbody.appendChild(row));
  });
}

export function showConnections(peer: Peer) {
  const id = peer.id;
  const connections: Connection[] = peer.connections ?? [];

  // Sort connections by location
  connections.sort((a, b) => a.location - b.location);

  // Find the existing peer connections table
  const tableBody = document.getElementById("peer-connections-b")!;

  // Clear the existing table rows
  while (tableBody.firstChild) {
    tableBody.removeChild(tableBody.firstChild);
  }

  // Create the table header row
  const headerRow = document.createElement("tr");
  const idHeader = document.createElement("th");
  idHeader.textContent = "Neighbour Id";
  const locationHeader = document.createElement("th");
  locationHeader.textContent = "Location";
  headerRow.appendChild(idHeader);
  headerRow.appendChild(locationHeader);
  tableBody.appendChild(headerRow);

  // Create and append the table rows for all peers
  connections.forEach((connection) => {
    const row = document.createElement("tr");
    const idCell = document.createElement("td");
    idCell.textContent = connection.id.toString() ?? "";
    const locationCell = document.createElement("td");
    locationCell.textContent = connection.location.toString() ?? "";
    row.appendChild(idCell);
    row.appendChild(locationCell);
    tableBody.appendChild(row);
  });

  // Set title
  const idLocation = document.getElementById("peer-connections-t")!;
  idLocation.innerHTML = `<b>Peer Id</b>: ${id}, <b>Location</b>: ${
    peer.currentLocation ?? ""
  }`;
}

function displayHistory(peer: Peer): string {
  let historyHTML = '<table class="table is-fullwidth is-striped">';
  historyHTML +=
    "<thead><tr><th>Timestamp</th><th>Type</th><th>From</th><th>To</th></tr></thead><tbody>";

  historyHTML += peer.history
    .map((change) => {
      return `<tr><td>${change.timestamp}</td><td>${change.type}</td><td>${change.from.id}</td><td>${change.to.id}</td></tr>`;
    })
    .join("");

  historyHTML += "</tbody></table>";

  return historyHTML;
}
