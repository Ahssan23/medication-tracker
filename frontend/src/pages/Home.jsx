import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Home = () => {
  const navigate = useNavigate();
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

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/login");
  };

  // ✅ Handle form input
  const handleFormChange = (e) => {
    setMedicineForm({ ...medicineForm, [e.target.name]: e.target.value });
  };

  // ✅ Format AM/PM time
  const formatTime = (time) => {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };
  function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4 - (base64String.length % 4))%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=window.atob(base64);
  const output=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;++i) output[i]=raw.charCodeAt(i);
  return output;
}

const subscribeForPush = async () => {
  try {
    if (!('serviceWorker' in navigator)) return alert('Service Worker not supported');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return alert('Please allow notifications');

    // register SW
    const reg = await navigator.serviceWorker.register('/sw.js');

    // get VAPID public key from backend
    const vapidRes = await fetch('http://localhost:5000/api/subscribe/vapid');
    const { publicKey } = await vapidRes.json();

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // send subscription to backend (it expects Authorization header)
    const token = localStorage.getItem('token'); // ensure token exists
    const save = await fetch('http://localhost:5000/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });

    const result = await save.json();
    if (save.ok) alert('Subscribed ✅');
    else alert(result.message || 'Subscribe failed');
  } catch (err) {
    console.error('subscribeForPush error', err);
    alert('Subscription failed — check console');
  }
};

  // ✅ Fetch user + medicines
  useEffect(() => {
    const storedUser = localStorage.getItem("auth");
    if (!storedUser) return;

    const user = JSON.parse(storedUser);
    setUserName(user.name || "User");

    fetch(`http://localhost:5000/api/medicines/${user._id}`)
      .then((res) => res.json())
      .then((data) => {
        setMedicines(data);
        setFilteredMedicines(data); // initial list
      })
      .catch((err) => console.error("Error fetching medicines:", err));
  }, []);

  // ✅ Auto remove medicines when expired
  useEffect(() => {
    const now = new Date();
    const validMeds = medicines.filter((m) => {
      const endDateTime = new Date(`${m.endDate}T${m.medicineTime}`);
      return endDateTime >= now;
    });
    setFilteredMedicines(validMeds);
  }, [medicines]);

  // ✅ Date filter
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

  // ✅ Add new medicine
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    const storedUser = localStorage.getItem("auth");
    if (!storedUser) return alert("User not logged in");

    const user = JSON.parse(storedUser);
    const response = await fetch("http://localhost:5000/api/medicines/add", {
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

  // ✅ Delete medicine
  const handleDeleteMedicine = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;

    const res = await fetch(`http://localhost:5000/api/medicines/delete/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMedicines(medicines.filter((m) => m._id !== id));
    } else {
      alert("Failed to delete medicine ❌");
    }
  };

  // ✅ Edit medicine
  const handleEditMedicine = (medicine) => {
    setEditingMedicine(medicine);
    setMedicineForm({
      name: medicine.name,
      startDate: medicine.startDate,
      endDate: medicine.endDate,
      medicineTime: medicine.medicineTime,
    });
  };

  // ✅ Update medicine
  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    const res = await fetch(
      `http://localhost:5000/api/medicines/update/${editingMedicine._id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medicineForm),
      }
    );

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
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-6 flex flex-col justify-between rounded-r-3xl">
        <div>
          <h2 className="text-2xl font-semibold mb-8 text-yellow-600">
            Medication Tracker
          </h2>
          <nav className="space-y-4">
            <button
              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                activeSection === "today"
                  ? "bg-indigo-100 text-yellow-600 font-medium"
                  : "hover:bg-indigo-50"
              }`}
              onClick={() => setActiveSection("today")}
            >
              Today’s Medicines
            </button>

            {/* ✅ New Button for All Medicines */}
            <button
              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                activeSection === "all"
                  ? "bg-indigo-100 text-yellow-500 font-medium"
                  : "hover:bg-indigo-50"
              }`}
              onClick={() => setActiveSection("all")}
            >
              All Medicines
            </button>

            <button
              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                activeSection === "manage"
                  ? "bg-indigo-100 text-yellow-300 font-medium"
                  : "hover:bg-indigo-50"
              }`}
              onClick={() => setActiveSection("manage")}
            >
              Manage Medicines
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-6 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-medium transition"
        >
          Logout
        </button>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-10 overflow-y-auto relative">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold text-gray-800">
            Welcome, <span className="text-yellow-600">{userName}</span> 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Track and manage your medicines with ease.
          </p>
          <button
  onClick={subscribeForPush}
  className="ml-4 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
>
  Enable Notifications
</button>

        </header>

        {/* ✅ Today’s Medicines Section */}
        {activeSection === "today" && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-yellow-500">
              Medicines for Today
            </h2>

            {/* ✅ Date Filter */}
            <div className="mb-4 flex items-center space-x-3">
              <label className="font-medium text-gray-400">Filter by Date:</label>
              <input
                type="date"
                value={filterDate}
                onChange={handleFilterChange}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              {filterDate && (
                <button
                  onClick={() => {
                    setFilterDate("");
                    setFilteredMedicines(medicines);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              {filteredMedicines.length === 0 ? (
                <p className="text-gray-500 text-center">No medicines found 🕒</p>
              ) : (
                filteredMedicines.map((med) => (
                  <div
                    key={med._id}
                    className="flex justify-between items-center py-3 border-b last:border-none"
                  >
                    <div>
                      <p className="font-medium">{med.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(med.medicineTime)}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEditMedicine(med)}
                        className="bg-blue-100 text-yello-500 px-3 py-1 rounded-lg hover:bg-blue-200 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMedicine(med._id)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ✅ All Medicines Section */}
        {activeSection === "all" && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-yellow-500">
              All Medicines
            </h2>

            <div className="bg-white rounded-2xl shadow p-6">
              {medicines.length === 0 ? (
                <p className="text-gray-500 text-center">
                  No medicines added yet 🕒
                </p>
              ) : (
                medicines.map((med) => (
                  <div
                    key={med._id}
                    className="flex justify-between items-center py-3 border-b last:border-none"
                  >
                    <div>
                      <p className="font-medium">{med.name}</p>
                      <p className="text-sm text-gray-500">
                        {med.startDate} → {med.endDate} •{" "}
                        {formatTime(med.medicineTime)}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEditMedicine(med)}
                        className="bg-blue-100 text-yellow-500 px-3 py-1 rounded-lg hover:bg-blue-200 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMedicine(med._id)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ✅ Manage Medicines Section */}
        {activeSection === "manage" && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-yellow-500">
              Set a New Medicine
            </h2>
            <form
              onSubmit={handleAddMedicine}
              className="bg-white rounded-2xl shadow p-6 max-w-md space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Medicine Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={medicineForm.name}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={medicineForm.startDate}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={medicineForm.endDate}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Medicine Time
                </label>
                <input
                  type="time"
                  name="medicineTime"
                  value={medicineForm.medicineTime}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-medium transition"
              >
                Save Medicine
              </button>
            </form>
          </section>
        )}

        {/* ✅ Edit Slide-in Form */}
        <AnimatePresence>
          {editingMedicine && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className="fixed top-0 right-0 w-full sm:w-1/3 h-full bg-white shadow-2xl p-8 z-50 overflow-y-auto"
            >
              <h2 className="text-2xl font-semibold mb-6 text-yellow-500">
                Edit Medicine
              </h2>
              <form onSubmit={handleUpdateMedicine} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={medicineForm.name}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={medicineForm.startDate}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={medicineForm.endDate}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Medicine Time
                  </label>
                  <input
                    type="time"
                    name="medicineTime"
                    value={medicineForm.medicineTime}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-medium transition"
                >
                  Update Medicine
                </button>

                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Home;
