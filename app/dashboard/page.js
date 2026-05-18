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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedType, setSelectedType] = useState("salesman");

  const AUTO_LOGOUT_MINUTES = 5;

  useEffect(() => {
    checkUser();
    loadLatestTrips("salesman");
  }, []);

  // Auto logout after inactivity
  useEffect(() => {
    let timeout;

    const logoutUser = async () => {
      await supabase.auth.signOut();
      router.push("/");
    };

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(logoutUser, AUTO_LOGOUT_MINUTES * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeout);

      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [router]);

  async function checkUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      router.push("/unauthorized");
      return;
    }

    setAdminEmail(data.user.email);
    setCheckingAuth(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function formatSriLankaTime(dateValue) {
    if (!dateValue) return "-";

    let value = String(dateValue).trim();
    value = value.replace(" ", "T");

    const hasTimezone =
      value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);

    if (!hasTimezone) {
      value = value + "Z";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("en-LK", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  function sriLankaStartOfDayToUtc(dateString) {
    if (!dateString) return null;

    const utcDate = new Date(`${dateString}T00:00:00+05:30`);
    return utcDate.toISOString().replace("T", " ").replace("Z", "");
  }

  function sriLankaEndOfDayToUtc(dateString) {
    if (!dateString) return null;

    const utcDate = new Date(`${dateString}T23:59:59+05:30`);
    return utcDate.toISOString().replace("T", " ").replace("Z", "");
  }

  function getTrackingType(row) {
    return row.tracking_type === "salesman" ? "Salesman" : "Driver";
  }

  function getPersonName(row) {
    if (row.tracking_type === "salesman") {
      return row.salesmen?.username || "-";
    }

    return row.drivers?.username || "-";
  }

  function getPersonContact(row) {
    if (row.tracking_type === "salesman") {
      return row.salesmen?.phone_number || "-";
    }

    return row.drivers?.phone_number || "-";
  }

  function getVehicleOrEmail(row) {
    if (row.tracking_type === "salesman") {
      return row.salesmen?.email || "-";
    }

    return row.drivers?.vehicle_number || "-";
  }

  // Current location means latest real tracked location from trips table
  function getDisplayLocation(row) {
    return row.current_location || "Not available";
  }

  // Total KM means latest running KM from trips table
  function getDisplayKm(row) {
    return Number(row.total_km || 0).toFixed(2);
  }

  // Current map means latest real/current coordinates from trips table
  function getDisplayMapLat(row) {
    return row.current_lat;
  }

  function getDisplayMapLng(row) {
    return row.current_lng;
  }

  async function loadLatestTrips(type = selectedType) {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        *,
        drivers(username, vehicle_number, phone_number),
        salesmen(username, email, phone_number)
      `)
      .eq("tracking_type", type)
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
      .select(`
        *,
        drivers(username, vehicle_number, phone_number),
        salesmen(username, email, phone_number)
      `)
      .eq("tracking_type", selectedType)
      .order("start_time", { ascending: false });

    if (fromDate) {
      query = query.gte("start_time", sriLankaStartOfDayToUtc(fromDate));
    }

    if (toDate) {
      query = query.lte("start_time", sriLankaEndOfDayToUtc(toDate));
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    let filtered = data || [];

    if (driverSearch.trim()) {
      filtered = filtered.filter((item) => {
        const name =
          item.tracking_type === "salesman"
            ? item.salesmen?.username
            : item.drivers?.username;

        return name
          ?.toLowerCase()
          .trim()
          .includes(driverSearch.toLowerCase().trim());
      });
    }

    setRows(filtered);
  }

  async function getImageUrl(path) {
    if (!path) {
      alert("No proof image uploaded");
      return;
    }

    const { data, error } = await supabase.storage
      .from("odometer-images")
      .createSignedUrl(path, 30);

    if (error) {
      alert(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  // Visit Route = confirmed N1, N2, N3 points from salesman_visits table
  async function viewSalesmanRoute(row) {
    if (row.tracking_type !== "salesman") {
      alert("Visit route is only available for salesman records.");
      return;
    }

    const { data, error } = await supabase
      .from("salesman_visits")
      .select("*")
      .eq("trip_id", row.id)
      .order("visit_no", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert("No confirmed visit locations found for this journey.");
      return;
    }

    const validPoints = data.filter((p) => p.latitude && p.longitude);

    if (validPoints.length === 0) {
      alert("No valid GPS points found for this route.");
      return;
    }

    if (validPoints.length === 1) {
      const p = validPoints[0];
      window.open(
        `https://www.google.com/maps?q=${p.latitude},${p.longitude}`,
        "_blank"
      );
      return;
    }

    const origin = `${validPoints[0].latitude},${validPoints[0].longitude}`;

    const destination = `${validPoints[validPoints.length - 1].latitude},${
      validPoints[validPoints.length - 1].longitude
    }`;

    const waypoints = validPoints
      .slice(1, -1)
      .map((p) => `${p.latitude},${p.longitude}`)
      .join("|");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }

    window.open(url, "_blank");
  }

  function exportExcel() {
    const excelRows = rows.map((r) => ({
      "Tracking Type": getTrackingType(r),
      Name: getPersonName(r),
      "Vehicle / Email": getVehicleOrEmail(r),
      "Phone Number": getPersonContact(r),
      "Start Time (Sri Lanka)": formatSriLankaTime(r.start_time),
      "Stop Time (Sri Lanka)": formatSriLankaTime(r.stop_time),
      "Current Location": getDisplayLocation(r),
      "Total KM": getDisplayKm(r),
      "Proof Image Status": r.end_meter_image ? "Uploaded" : "Not Uploaded",
      "Verification Status": r.verification_status || "Pending",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Tracking Report");
    XLSX.writeFile(workbook, "tracking_report.xlsx");
  }

  function changeTrackingType(type) {
    setSelectedType(type);
    setRows([]);
    loadLatestTrips(type);
  }

  if (checkingAuth) {
    return (
      <main className="page">
        <div className="loginCard">
          <h1>Checking access...</h1>
          <p>Please wait.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar logout={logout} />

      <main className="page">
        <div className="dashboardHeader">
          <div>
            <h1>Admin Dashboard</h1>

            <p style={{ color: "#9aa8bb" }}>Logged in as: {adminEmail}</p>

            <p style={{ color: "#ffb86b", fontSize: 13, marginTop: 6 }}>
              Security: This session will automatically logout after{" "}
              {AUTO_LOGOUT_MINUTES} minutes of inactivity.
            </p>
          </div>

          <button
            className="primaryBtn"
            onClick={() => loadLatestTrips(selectedType)}
          >
            Refresh
          </button>
        </div>

        <div className="card">
          <h2>Search & Generate Tracking Report</h2>

          <div className="grid">
            <div>
              <label>Driver / Salesman Name</label>
              <input
                placeholder="Search driver or salesman name"
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

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <button className="primaryBtn" onClick={generateReport}>
              Generate Report
            </button>

            <button className="secondaryBtn" onClick={exportExcel}>
              Export Excel
            </button>
          </div>
        </div>

        <div className="card">
          <h2>
            {selectedType === "salesman"
              ? "Salesman Tracking Details"
              : "Driver Tracking Details"}
          </h2>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 14,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <button
              className={
                selectedType === "salesman" ? "primaryBtn" : "secondaryBtn"
              }
              onClick={() => changeTrackingType("salesman")}
            >
              Salesman Details
            </button>

            <button
              className={
                selectedType === "driver" ? "primaryBtn" : "secondaryBtn"
              }
              onClick={() => changeTrackingType("driver")}
            >
              Driver Details
            </button>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Vehicle / Email</th>
                  <th>Phone</th>
                  <th className="locationCol">Current Location</th>
                  <th>Total KM</th>
                  <th>Time</th>
                  <th>Current Map</th>
                  <th>Visit Route</th>
                  <th>Proof Image</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span
                        className={
                          r.tracking_type === "salesman"
                            ? "tagSalesman"
                            : "tagDriver"
                        }
                      >
                        {getTrackingType(r)}
                      </span>
                    </td>

                    <td>{getPersonName(r)}</td>

                    <td>{getVehicleOrEmail(r)}</td>

                    <td>{getPersonContact(r)}</td>

                    <td className="locationCol">{getDisplayLocation(r)}</td>

                    <td>{getDisplayKm(r)} km</td>

                    <td>{formatSriLankaTime(r.start_time)}</td>

                    <td>
                      {getDisplayMapLat(r) && getDisplayMapLng(r) ? (
                        <a
                          className="mapBtn"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`https://www.google.com/maps?q=${getDisplayMapLat(
                            r
                          )},${getDisplayMapLng(r)}`}
                        >
                          View on Map
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      {r.tracking_type === "salesman" ? (
                        <button
                          className="secondaryBtn"
                          onClick={() => viewSalesmanRoute(r)}
                        >
                          View Route
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      {r.end_meter_image ? (
                        <button
                          className="secondaryBtn"
                          onClick={() => getImageUrl(r.end_meter_image)}
                        >
                          View Proof
                        </button>
                      ) : (
                        <span style={{ color: "#9aa8bb" }}>No Image</span>
                      )}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ color: "#9aa8bb" }}>
                      No tracking records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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