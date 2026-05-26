import { useEffect, useMemo, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { listDevices } from "../graphql/queries";
import { createDevice, updateDevice, deleteDevice } from "../graphql/mutations";

const client = generateClient();

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function compareStrings(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

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

function stableSort(items, compare) {
  return items
    .map((item, index) => [item, index])
    .sort((a, b) => compare(a[0], b[0]) || a[1] - b[1])
    .map(([item]) => item);
}

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

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [query, setQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "id", dir: "asc" });
  const [newDevice, setNewDevice] = useState(getEmptyDevice());

  // Fetch devices from DynamoDB on load
  useEffect(() => {
    async function fetchDevices() {
      try {
        const result = await client.graphql({ query: listDevices });
        setDevices(result.data.listDevices.items);
      } catch (err) {
        console.error("Error fetching devices:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDevices();
  }, []);

  function toggleSort(key) {
    setSortConfig((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
  }

  function ariaSortFor(key) {
    if (sortConfig.key !== key) return "none";
    return sortConfig.dir === "asc" ? "ascending" : "descending";
  }

  function sortIndicator(key) {
    if (sortConfig.key !== key) return "\u2195";
    return sortConfig.dir === "asc" ? "\u25B2" : "\u25BC";
  }

  const visibleDevices = useMemo(() => {
    const list = Array.isArray(devices) ? devices : [];
    const q = normalize(query);
    const filtered = q
      ? list.filter((device) => {
          const haystack = [
            device.id, device.name, device.softwareVersion,
            device.dbVersion, device.firmwareVersion, device.ipAddress
          ].map(normalize).join(" ");
          return haystack.includes(q);
        })
      : list;
    const dir = sortConfig.dir === "desc" ? -1 : 1;
    const compareDevice = (a, b) => {
      switch (sortConfig.key) {
        case "name": return compareStrings(a.name, b.name);
        case "softwareVersion": return compareVersions(a.softwareVersion, b.softwareVersion);
        case "dbVersion": return compareVersions(a.dbVersion, b.dbVersion);
        case "firmwareVersion": return compareVersions(a.firmwareVersion, b.firmwareVersion);
        case "ipAddress": return compareIp(a.ipAddress, b.ipAddress);
        case "id":
        default: return compareStrings(a.id, b.id);
      }
    };
    return stableSort(filtered, (a, b) => compareDevice(a, b) * dir);
  }, [devices, query, sortConfig.dir, sortConfig.key]);

  function handleStartAddDevice() {
    setEditingDeviceId(null);
    setNewDevice(getEmptyDevice());
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setNewDevice((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAddDevice(event) {
    event.preventDefault();
    if (!newDevice.id || !newDevice.name || !newDevice.softwareVersion ||
        !newDevice.dbVersion || !newDevice.firmwareVersion || !newDevice.ipAddress) {
      alert("Please fill out all fields.");
      return;
    }

    const newIdLower = newDevice.id.toLowerCase();
    const editingIdLower = editingDeviceId ? editingDeviceId.toLowerCase() : null;
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

    try {
      if (editingDeviceId) {
        // Update existing device in DynamoDB
        const result = await client.graphql({
          query: updateDevice,
          variables: { input: newDevice }
        });
        setDevices((prev) =>
          prev.map((d) => d.id === editingDeviceId ? result.data.updateDevice : d)
        );
      } else {
        // Create new device in DynamoDB
        const result = await client.graphql({
          query: createDevice,
          variables: { input: newDevice }
        });
        setDevices((prev) => [...prev, result.data.createDevice]);
      }
    } catch (err) {
      console.error("Error saving device:", err);
      alert("Failed to save device. Please try again.");
    }

    setNewDevice(getEmptyDevice());
    setEditingDeviceId(null);
    setShowForm(false);
  }

  async function handleRemoveDevice(deviceId) {
    const confirmDelete = window.confirm("Are you sure you want to remove this device?");
    if (!confirmDelete) return;

    try {
      await client.graphql({
        query: deleteDevice,
        variables: { input: { id: deviceId } }
      });
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch (err) {
      console.error("Error deleting device:", err);
      alert("Failed to delete device. Please try again.");
    }

    setOpenMenuId(null);
  }

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

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading devices...</div>;
  }

  return (
    <>
      <div className="flex justify-start">
        <button className="btn-primary mb-6" onClick={handleStartAddDevice}>
          ADD DEVICE
        </button>
      </div>

      {showForm && (
        <section className="card">
          <h2>{editingDeviceId ? "Edit Device" : "Add New Device"}</h2>
          <form className="device-form" onSubmit={handleAddDevice}>
            <input type="text" name="id" placeholder="Device ID" value={newDevice.id} onChange={handleChange} />
            <input type="text" name="name" placeholder="Device Name" value={newDevice.name} onChange={handleChange} />
            <input type="text" name="softwareVersion" placeholder="Software Version" value={newDevice.softwareVersion} onChange={handleChange} />
            <input type="text" name="dbVersion" placeholder="DB Version" value={newDevice.dbVersion} onChange={handleChange} />
            <input type="text" name="firmwareVersion" placeholder="Firmware Version" value={newDevice.firmwareVersion} onChange={handleChange} />
            <input type="text" name="ipAddress" placeholder="IP Address" value={newDevice.ipAddress} onChange={handleChange} />
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button className="btn-secondary">
                {editingDeviceId ? "Update Device" : "Save Device"}
              </button>
              <button
                type="button"
                className="btn-secondary"
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

      <section className="card">
        <h2>Devices</h2>
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
              <th aria-sort={ariaSortFor("id")}>
                <button type="button" className="th-button" onClick={() => toggleSort("id")}>
                  Device ID <span className="sort-indicator" aria-hidden="true">{sortIndicator("id")}</span>
                </button>
              </th>
              <th aria-sort={ariaSortFor("name")}>
                <button type="button" className="th-button" onClick={() => toggleSort("name")}>
                  Name <span className="sort-indicator" aria-hidden="true">{sortIndicator("name")}</span>
                </button>
              </th>
              <th aria-sort={ariaSortFor("softwareVersion")}>
                <button type="button" className="th-button" onClick={() => toggleSort("softwareVersion")}>
                  Software <span className="sort-indicator" aria-hidden="true">{sortIndicator("softwareVersion")}</span>
                </button>
              </th>
              <th aria-sort={ariaSortFor("dbVersion")}>
                <button type="button" className="th-button" onClick={() => toggleSort("dbVersion")}>
                  DB <span className="sort-indicator" aria-hidden="true">{sortIndicator("dbVersion")}</span>
                </button>
              </th>
              <th aria-sort={ariaSortFor("firmwareVersion")}>
                <button type="button" className="th-button" onClick={() => toggleSort("firmwareVersion")}>
                  Firmware <span className="sort-indicator" aria-hidden="true">{sortIndicator("firmwareVersion")}</span>
                </button>
              </th>
              <th aria-sort={ariaSortFor("ipAddress")}>
                <button type="button" className="th-button" onClick={() => toggleSort("ipAddress")}>
                  IP Address <span className="sort-indicator" aria-hidden="true">{sortIndicator("ipAddress")}</span>
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
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
                      <button
                        aria-label={`Actions for ${device.id}`}
                        className="menu-button"
                        onClick={() => setOpenMenuId(openMenuId === device.id ? null : device.id)}
                        type="button"
                      >
                        {"\u22EE"}
                      </button>
                      {openMenuId === device.id && (
                        <div className="dropdown-menu">
                          <button className="dropdown-item" onClick={() => handleEditDevice(device)} type="button">
                            Edit
                          </button>
                          <button className="dropdown-item delete" onClick={() => handleRemoveDevice(device.id)} type="button">
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