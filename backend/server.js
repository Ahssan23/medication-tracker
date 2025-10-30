import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Home = () => {
  const navigate = useNavigate();
  const backendLink = import.meta.env.VITE_BACKEND_LINK;
  const [activeSection, setActiveSection] = useState("today");
  const [userName, setUserName] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [medicineForm, setMedicineForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    medicineTime: "",
  });
  const [editingMedicine, setEditingMedicine] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/login");
  };

  const handleFormChange = (e) => {
    setMedicineForm({ ...medicineForm, [e.target.name]: e.target.value });
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
    return output;
  }

  const subscribeForPush = async () => {
    try {
      if (!("serviceWorker" in navigator)) return alert("Service Worker not supported");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return alert("Please allow notifications");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const vapidRes = await fetch(`${backendLink}/api/subscribe/vapid`);
      const { publicKey } = await vapidRes.json();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const token = localStorage.getItem("token");
      const save = await fetch(`${backendLink}/api/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      });

      const result = await save.json();
      if (save.ok) alert("Subscribed ✅");
      else alert(result.message || "Subscribe failed");
    } catch (err) {
      console.error("subscribeForPush error", err);
      alert("Subscription failed — check console");
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("auth");
    if (!storedUser) return;

    const user = JSON.parse(storedUser);
    setUserName(user.name || "User");

    fetch(`${backendLink}/api/medicines/${user._id}`)
      .then((res) => res.json())
      .then((data) => {
        setMedicines(data);
        setFilteredMedicines(data);
      })
      .catch((err) => console.error("Error fetching medicines:", err));
  }, []);

  useEffect(() => {
    const now = new Date();
    const validMeds = medicines.filter((m) => {
      const endDateTime = new Date(`${m.endDate}T${m.medicineTime}`);
      return endDateTime >= now;
    });
    setFilteredMedicines(validMeds);
  }, [medicines]);

  const handleFilterChange = (e) => {
    const selectedDate = e.target.value;
    setFilterDate(selectedDate);

    if (!selectedDate) {
      setFilteredMedicines(medicines);
      return;
    }

    const filtered = medicines.filter((m) => {
      return m.startDate <= selectedDate && m.endDate >= selectedDate;
    });

    setFilteredMedicines(filtered);
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    const storedUser = localStorage.getItem("auth");
    if (!storedUser) return alert("User not logged in");

    const user = JSON.parse(storedUser);
    const response = await fetch(`${backendLink}/api/medicines/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id, ...medicineForm }),
    });

    const data = await response.json();
    if (response.ok) {
      alert("Medicine saved ✅");
      setMedicines([...medicines, data]);
      setMedicineForm({ name: "", startDate: "", endDate: "", medicineTime: "" });
    } else {
      alert(data.message || "Something went wrong");
    }
  };

  const handleDeleteMedicine = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;

    const res = await fetch(`${backendLink}/api/medicines/delete/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMedicines(medicines.filter((m) => m._id !== id));
    } else {
      alert("Failed to delete medicine ❌");
    }
  };

  const handleEditMedicine = (medicine) => {
    setEditingMedicine(medicine);
    setMedicineForm({
      name: medicine.name,
      startDate: medicine.startDate,
      endDate: medicine.endDate,
      medicineTime: medicine.medicineTime,
    });
  };

  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    const res = await fetch(`${backendLink}/api/medicines/update/${editingMedicine._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(medicineForm),
    });

    const data = await res.json();
    if (res.ok) {
      setMedicines(medicines.map((m) => (m._id === data._id ? data : m)));
      alert("Medicine updated ✅");
      setEditingMedicine(null);
      setMedicineForm({ name: "", startDate: "", endDate: "", medicineTime: "" });
    } else {
      alert(data.message || "Failed to update");
    }
  };

  return (
    <div className="flex h-screen bg-linear-to-br from-blue-50 to-indigo-100 text-gray-800">
      {/* rest of your JSX remains exactly same */}
    </div>
  );
};

export default Home;
