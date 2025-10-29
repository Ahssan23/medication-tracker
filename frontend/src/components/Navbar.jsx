import React from "react";
import { Link } from "react-router-dom";
// import './Navbar.css'

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="logo">
        <img src="/public/logo.png" alt="logo" style={{ height: 28 }} />{" "}
        <span>Medication Tracker</span>
      </div>
      <div className="links">
        <Link to="/login">Login</Link>
        <Link to="/signup">Signup</Link>
      </div>
    </nav>
  );
};

export default Navbar;
