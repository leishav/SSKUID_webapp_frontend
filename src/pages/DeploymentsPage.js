import deployments from "../data/deployments.json";
import { getStatusClass } from "../utils/status";

export default function DeploymentsPage() {
    return(
        <section className="card">
          <h2>Deployment History</h2>
          <div className="deployment-list">
            {deployments.map((item, index) => (
              <div className="deployment-item" key={index}>
                <div>
                  <strong>{item.target}</strong>
                  <p>{item.version}</p>
                </div>
                <div>
                  <p>{item.date}</p>
                </div>
                <span className={`badge ${getStatusClass(item.status)}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>
    );
}