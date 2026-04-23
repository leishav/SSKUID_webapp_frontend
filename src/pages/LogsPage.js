import logs from "../data/logs.json";
import { getStatusClass } from "../utils/status";

export default function LogsPage() {
    return(
        <section className="card">
          <h2>Debug Logs</h2>
          <div className="log-list">
            {logs.map((log, index) => (
              <div className="log-item" key={index}>
                <span>{log.time}</span>
                <span className={`badge ${getStatusClass(log.level)}`}>{log.level}</span>
                <span>{log.deviceId}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </section>
    );
}