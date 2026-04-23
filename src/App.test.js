import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test("tabs navigate to deployments", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>
  );

  userEvent.click(screen.getByRole("tab", { name: /deployments/i }));
  expect(screen.getByRole("heading", { name: /deployment history/i })).toBeInTheDocument();
});
