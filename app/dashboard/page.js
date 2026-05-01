"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const [adminEmail, setAdminEmail] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    checkUser();
    loadLatestTrips();
  }, []);

  async function checkUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      router.push("/");
      return;
    }

    setAdminEmail(data.user.email);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function loadLatestTrips() {
    const { data, error } = await supabase
      .from("trips")
      .select("*, drivers(username, vehicle_number, phone_number)")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      alert(error.message);
      return;
    }

    setRows(data || []);
  }

  async function generateReport() {
    let query = supabase
      .from("trips")
      .select("*, drivers(username, vehicle_number, phone_number)")
      .order("start_time", { ascending: false });

    if (fromDate) {
      query = query.gte("start_time", `${fromDate}T00:00:00`);
    }

    if (toDate) {
      query = query.lte("start_time", `${toDate}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    let filtered = data || [];

    if (driverSearch.trim()) {
      filtered = filtered.filter((item) =>
        item.drivers?.username
          ?.toLowerCase()
          .includes(driverSearch.toLowerCase())
      );
    }

    setRows(filtered);
  }

  async function getImageUrl(path) {
    if (!path) {
      alert("No image uploaded");
      return;
    }

    const { data, error } = await supabase.storage
      .from("odometer-images")
      .createSignedUrl(path, 60 * 10);

    if (error) {
      alert(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  function exportExcel() {
    const excelRows = rows.map((r) => ({
      "Driver Name": r.drivers?.username || "",
      "Vehicle Number": r.drivers?.vehicle_number || "",
      "Phone Number": r.drivers?.phone_number || "",
      "Start Time": r.start_time || "",
      "Stop Time": r.stop_time || "",
      "Current Location": r.current_location || "",
      "Total KM": r.total_km || 0,
      "Verification Status": r.verification_status || "Pending",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Driver Report");
    XLSX.writeFile(workbook, "driver_tracking_report.xlsx");
  }

  return (
    <>
      <Navbar logout={logout} />

      <main className="page">
        <div className="dashboardHeader">
          <div>
            <h1>Admin Dashboard</h1>
            <p style={{ color: "#9aa8bb" }}>Logged in as: {adminEmail}</p>
          </div>

          <button className="primaryBtn" onClick={loadLatestTrips}>
            Refresh
          </button>
        </div>

        <div className="card">
          <h2>Search & Generate Driver Report</h2>

          <div className="grid">
            <div>
              <label>Driver Name</label>
              <input
                placeholder="Search driver name"
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
              />
            </div>

            <div>
              <label>From Date</label>
              <input
                type="date"
                className="dateInput"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label>To Date</label>
              <input
                type="date"
                className="dateInput"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
  <button className="primaryBtn" onClick={generateReport}>
    Generate Report
  </button>

  <button className="secondaryBtn" onClick={exportExcel}>
    Export Excel
  </button>
</div>
      
        </div>

        <div className="card">
          <h2>Driver Tracking Details</h2>

          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Total KM</th>
                <th>Time</th>
                <th>Map</th>
                <th>Meter Images</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.drivers?.username || "-"}</td>
                  <td>{r.drivers?.vehicle_number || "-"}</td>
                  <td>{r.drivers?.phone_number || "-"}</td>
                  <td>{r.current_location || "Not available"}</td>
                  <td>{Number(r.total_km || 0).toFixed(2)} km</td>
                  <td>
                    {r.start_time
                      ? new Date(r.start_time).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    {r.current_lat && r.current_lng ? (
                      <a
                        className="mapBtn"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://www.google.com/maps?q=${r.current_lat},${r.current_lng}`}
                      >
                        View on Map
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <button
                      className="secondaryBtn"
                      onClick={() => getImageUrl(r.start_meter_image)}
                    >
                      Start
                    </button>{" "}
                    <button
                      className="secondaryBtn"
                      onClick={() => getImageUrl(r.end_meter_image)}
                    >
                      End
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

function Navbar({ logout }) {
  return (
    <nav className="navbar">
      <div className="brand">
        <div className="logoBox">
          <img src="/logo.png" alt="Dubhe Logo" />
        </div>

        <div className="brandText">
          <h2>
            CEYLON <span>DUBHE</span>
          </h2>
          <p>BUILD • POWER • PERFORM</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="websiteBtn"
          onClick={() => window.open("https://www.ceylondubhe.com", "_blank")}
        >
          GO TO WEBSITE
        </button>

        <button className="secondaryBtn" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}