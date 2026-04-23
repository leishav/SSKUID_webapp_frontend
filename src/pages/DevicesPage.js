import { useMemo, useState } from "react";
import starterDevices from "../data/devices.json";

// DevicesPage
// - Shows the Devices table
// - Lets you add/edit/remove devices (in-memory)
// - Provides client-side search + sorting
//
// Tip: The page supports both "controlled" and "uncontrolled" usage.
// - Controlled: parent passes `devices` + `setDevices` (App.js does this today)
// - Uncontrolled: omit those props and the page uses `initialDevices` as local state

// -----------------------------------------------------------------------------
// Search + sort helpers (small, dependency-free utilities)
// -----------------------------------------------------------------------------

// Normalize values into a safe, lowercase string so search isn't case-sensitive
// and doesn't crash on null/undefined.
function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

// String compare with "natural" numeric ordering:
// - "DEV-2" comes before "DEV-10"
// - not case-sensitive (sensitivity: "base")
function compareStrings(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

// Versions should sort like numbers (1.2.10 > 1.2.2), not like strings.
// If parsing fails, we'll fall back to compareStrings.
function parseVersion(value) {
  if (!value) return null;
  const parts = String(value).split(".").map((part) => Number(part));
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts;
}

function compareVersions(a, b) {
  const av = parseVersion(a);
  const bv = parseVersion(b);

  if (!av && !bv) return compareStrings(a, b);
  if (!av) return 1;
  if (!bv) return -1;

  const length = Math.max(av.length, bv.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (av[i] ?? 0) - (bv[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Convert an IPv4 string into a sortable number.
function ipToNumber(ip) {
  const parts = String(ip ?? "").split(".");
  if (parts.length !== 4) return null;

  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;

  return nums.reduce((acc, n) => (acc << 8) + n, 0) >>> 0;
}

function compareIp(a, b) {
  const av = ipToNumber(a);
  const bv = ipToNumber(b);

  if (av == null && bv == null) return compareStrings(a, b);
  if (av == null) return 1;
  if (bv == null) return -1;

  return av - bv;
}

// Stable sort: if two items compare equal, keep their original order.
// This makes the table feel less "jumpy" when sorting values that tie.
function stableSort(items, compare) {
  return items
    .map((item, index) => [item, index])
    .sort((a, b) => compare(a[0], b[0]) || a[1] - b[1])
    .map(([item]) => item);
}

// Helper for resetting the form to a clean "new device" shape.
function getEmptyDevice() {
  return {
    id: "",
    name: "",
    softwareVersion: "",
    dbVersion: "",
    firmwareVersion: "",
    ipAddress: ""
  };
}

export default function DevicesPage({
  initialDevices = starterDevices,
  devices: devicesProp,
  setDevices: setDevicesProp
}) {
  // If `devices`/`setDevices` props are provided, we use them (controlled mode).
  // Otherwise we fall back to local state initialized from `initialDevices`.
  const [uncontrolledDevices, setUncontrolledDevices] = useState(initialDevices);
  const devices = devicesProp ?? uncontrolledDevices;
  const setDevices = setDevicesProp ?? setUncontrolledDevices;

  // UI state
  const [showForm, setShowForm] = useState(false); // show/hide add/edit form
  const [openMenuId, setOpenMenuId] = useState(null); // device.id of the currently-open row menu
  const [editingDeviceId, setEditingDeviceId] = useState(null); // null => add mode; otherwise edit mode

  // Table state (search text + current sort column/direction)
  const [query, setQuery] = useState(""); // free-text search query
  const [sortConfig, setSortConfig] = useState({ key: "id", dir: "asc" }); // current sort

  // Form state for the device being added/edited
  const [newDevice, setNewDevice] = useState(getEmptyDevice()); // current form values

  // Click a column header to sort that column.
  // Clicking the same header toggles asc/desc.
  function toggleSort(key) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }

  // `aria-sort` expects: "none" | "ascending" | "descending"
  function ariaSortFor(key) {
    if (sortConfig.key !== key) return "none";
    return sortConfig.dir === "asc" ? "ascending" : "descending";
  }

  // Visual indicator next to the column label.
  // Unicode escapes avoid text encoding issues in some terminals/editors.
  function sortIndicator(key) {
    if (sortConfig.key !== key) return "\u2195"; // \u2195
    return sortConfig.dir === "asc" ? "\u25B2" : "\u25BC"; // \u25B2 / \u25BC
  }

  // `visibleDevices` is what the table actually renders after filtering + sorting.
  // useMemo keeps this from recalculating when unrelated UI state changes.
  const visibleDevices = useMemo(() => {
    const list = Array.isArray(devices) ? devices : [];
    const q = normalize(query);

    // Search: match the query against a combined string of key fields.
    const filtered = q
      ? list.filter((device) => {
          const haystack = [
            device.id,
            device.name,
            device.softwareVersion,
            device.dbVersion,
            device.firmwareVersion,
            device.ipAddress
          ]
            .map(normalize)
            .join(" ");
          return haystack.includes(q);
        })
      : list;

    // Sorting direction multiplier.
    const dir = sortConfig.dir === "desc" ? -1 : 1;

    // Sorting: pick the best comparator for each column.
    const compareDevice = (a, b) => {
      switch (sortConfig.key) {
        case "name":
          return compareStrings(a.name, b.name);
        case "softwareVersion":
          return compareVersions(a.softwareVersion, b.softwareVersion);
        case "dbVersion":
          return compareVersions(a.dbVersion, b.dbVersion);
        case "firmwareVersion":
          return compareVersions(a.firmwareVersion, b.firmwareVersion);
        case "ipAddress":
          return compareIp(a.ipAddress, b.ipAddress);
        case "id":
        default:
          return compareStrings(a.id, b.id);
      }
    };

    return stableSort(filtered, (a, b) => compareDevice(a, b) * dir);
  }, [devices, query, sortConfig.dir, sortConfig.key]);



  // Start adding a new device (opens the form in "add" mode).
  function handleStartAddDevice() {
    setEditingDeviceId(null);
    setNewDevice(getEmptyDevice());
    setShowForm(true);
  }

  // Single onChange handler for all form inputs.
  function handleChange(event) {
    const { name, value } = event.target;
    setNewDevice((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  // Save the form:
  // - if `editingDeviceId` is set, we update that device
  // - otherwise we add a new device
  function handleAddDevice(event) {
    event.preventDefault();

    // Basic validation (you can replace `alert()` with inline errors later).
    if (
      !newDevice.id ||
      !newDevice.name ||
      !newDevice.softwareVersion ||
      !newDevice.dbVersion ||
      !newDevice.firmwareVersion ||
      !newDevice.ipAddress
    ) {
      alert("Please fill out all fields.");
      return;
    }

    const newIdLower = newDevice.id.toLowerCase();
    const editingIdLower = editingDeviceId ? editingDeviceId.toLowerCase() : null;

    // Enforce unique IDs (case-insensitive). When editing, allow keeping the same ID.
    const duplicateIdExists = devices.some((device) => {
      const deviceIdLower = device.id.toLowerCase();
      if (deviceIdLower !== newIdLower) return false;
      if (!editingIdLower) return true;
      return deviceIdLower !== editingIdLower;
    });

    if (duplicateIdExists) {
      alert("A device with that ID already exists.");
      return;
    }

    // One submit handler for both add + edit.
    if (editingDeviceId) {
      setDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.id === editingDeviceId ? newDevice : device
        )
      );
    } else {
      setDevices((prevDevices) => [...prevDevices, newDevice]);
    }

    setNewDevice(getEmptyDevice());
    setEditingDeviceId(null);
    setShowForm(false);
  }

  // Remove a device (with a safety confirmation).
  function handleRemoveDevice(deviceId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this device?"
    );
    if (!confirmDelete) return;

    setDevices((prevDevices) =>
      prevDevices.filter((device) => device.id !== deviceId)
    );

    setOpenMenuId(null);
  }

  // Populate the form with the selected device for editing.
  function handleEditDevice(device) {
    setNewDevice({
      id: device.id,
      name: device.name,
      softwareVersion: device.softwareVersion,
      dbVersion: device.dbVersion,
      firmwareVersion: device.firmwareVersion,
      ipAddress: device.ipAddress
    });

    setEditingDeviceId(device.id);
    setShowForm(true);
    setOpenMenuId(null);
  }

  return (
    <>
      {/* Top-level action: open the add/edit form */}
      <button className="add-device-btn" onClick={handleStartAddDevice}>
        ADD DEVICE
      </button>

      {/* Add/Edit form (same form reused; `editingDeviceId` decides mode) */}
      {showForm && (
        <section className="card">
          <h2>{editingDeviceId ? "Edit Device" : "Add New Device"}</h2>

          <form className="device-form" onSubmit={handleAddDevice}>
            <input
              type="text"
              name="id"
              placeholder="Device ID"
              value={newDevice.id}
              onChange={handleChange}
            />
            <input
              type="text"
              name="name"
              placeholder="Device Name"
              value={newDevice.name}
              onChange={handleChange}
            />
            <input
              type="text"
              name="softwareVersion"
              placeholder="Software Version"
              value={newDevice.softwareVersion}
              onChange={handleChange}
            />
            <input
              type="text"
              name="dbVersion"
              placeholder="DB Version"
              value={newDevice.dbVersion}
              onChange={handleChange}
            />
            <input
              type="text"
              name="firmwareVersion"
              placeholder="Firmware Version"
              value={newDevice.firmwareVersion}
              onChange={handleChange}
            />
            <input
              type="text"
              name="ipAddress"
              placeholder="IP Address"
              value={newDevice.ipAddress}
              onChange={handleChange}
            />

            <div className="form-actions">
              <button type="submit">
                {editingDeviceId ? "Update Device" : "Save Device"}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingDeviceId(null);
                  setNewDevice(getEmptyDevice());
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Devices table (client-side search + sort) */}
      <section className="card">
        <h2>Devices</h2>

        {/* Search + "showing X of Y" */}
        <div className="table-toolbar">
          <input
            className="search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, name, version, IP..."
            aria-label="Search devices"
          />
          <div className="table-count">
            {visibleDevices.length} of {devices.length}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              {/* Clickable table headers toggle sort */}
              <th aria-sort={ariaSortFor("id")}>
                <button
                  type="button"
                  className="th-button"
                  onClick={() => toggleSort("id")}
                >
                  Device ID{" "}
                  <span className="sort-indicator" aria-hidden="true">
                    {sortIndicator("id")}
                  </span>
                </button>
              </th>

              <th aria-sort={ariaSortFor("name")}>
                <button
                  type="button"
                  className="th-button"
                  onClick={() => toggleSort("name")}
                >
                  Name{" "}
                  <span className="sort-indicator" aria-hidden="true">
                    {sortIndicator("name")}
                  </span>
                </button>
              </th>

              <th aria-sort={ariaSortFor("softwareVersion")}>
                <button
                  type="button"
                  className="th-button"
                  onClick={() => toggleSort("softwareVersion")}
                >
                  Software{" "}
                  <span className="sort-indicator" aria-hidden="true">
                    {sortIndicator("softwareVersion")}
                  </span>
                </button>
              </th>

              <th aria-sort={ariaSortFor("dbVersion")}>
                <button
                  type="button"
                  className="th-button"
                  onClick={() => toggleSort("dbVersion")}
                >
                  DB{" "}
                  <span className="sort-indicator" aria-hidden="true">
                    {sortIndicator("dbVersion")}
                  </span>
                </button>
              </th>

              <th aria-sort={ariaSortFor("firmwareVersion")}>
                <button
                  type="button"
                  className="th-button"
                  onClick={() => toggleSort("firmwareVersion")}
                >
                  Firmware{" "}
                  <span className="sort-indicator" aria-hidden="true">
                    {sortIndicator("firmwareVersion")}
                  </span>
                </button>
              </th>

              <th aria-sort={ariaSortFor("ipAddress")}>
                <button
                  type="button"
                  className="th-button"
                  onClick={() => toggleSort("ipAddress")}
                >
                  IP Address{" "}
                  <span className="sort-indicator" aria-hidden="true">
                    {sortIndicator("ipAddress")}
                  </span>
                </button>
              </th>

              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {/* Empty state when nothing matches the current search */}
            {visibleDevices.length === 0 ? (
              <tr>
                <td colSpan={7}>No devices match "{query}".</td>
              </tr>
            ) : (
              visibleDevices.map((device) => (
                <tr key={device.id}>
                  <td>{device.id}</td>
                  <td>{device.name}</td>
                  <td>{device.softwareVersion}</td>
                  <td>{device.dbVersion}</td>
                  <td>{device.firmwareVersion}</td>
                  <td>{device.ipAddress}</td>
                  <td className="actions-cell">
                    <div className="menu-wrapper">
                      {/* Row actions menu (3-vertical-dots button) */}
                      <button
                        aria-label={`Actions for ${device.id}`}
                        className="menu-button"
                        onClick={() =>
                          setOpenMenuId(openMenuId === device.id ? null : device.id)
                        }
                        type="button"
                      >
                        {"\u22EE" /* vertical dots */}
                      </button>

                      {openMenuId === device.id && (
                        <div className="dropdown-menu">
                          <button
                            className="dropdown-item"
                            onClick={() => handleEditDevice(device)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="dropdown-item delete"
                            onClick={() => handleRemoveDevice(device.id)}
                            type="button"
                          >
                            Remove Device
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
