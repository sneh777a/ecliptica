import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Health from "./pages/Health";
import Finance from "./pages/Finance";
import Goals from "./pages/Goals";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes with Sidebar */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/health" element={<Health />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/goals" element={<Goals />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;