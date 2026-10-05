import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DeliveryApp } from "./app/components/DeliveryApp";
import "./app/globals.css";
createRoot(document.getElementById("root")!).render(<StrictMode><DeliveryApp /></StrictMode>);
