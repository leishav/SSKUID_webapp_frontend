import scans from "../data/scans.json";
import { getStatusClass } from "../utils/status";

export default function ScansPage() {
    return(
        <section className="card">
          <h2>Scan History</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Device</th>
                <th>SKU</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan, index) => (
                <tr key={index}>
                  <td>{scan.time}</td>
                  <td>{scan.deviceId}</td>
                  <td>{scan.sku}</td>
                  <td>
                    <span className={`badge ${getStatusClass(scan.result)}`}>
                      {scan.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
    )
}
