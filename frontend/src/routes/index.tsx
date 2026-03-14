import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMe, useLogout } from "../hooks/useAuth";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: me, isLoading } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  if (isLoading) return <p>Loading…</p>;

  if (!me) {
    navigate({ to: "/login" });
    return null;
  }

  const displayName =
    [me.first_name, me.last_name].filter(Boolean).join(" ") || me.email;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
      <h1>Welcome, {displayName}!</h1>
      <p>Email: {me.email}</p>
      <button onClick={handleLogout}>Sign out</button>
    </div>
  );
}
