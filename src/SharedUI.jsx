import React from "react";
import { ArrowLeft } from "lucide-react";

export function Button({ children, secondary = false, ...props }) {
  return (
    <button className={"btn" + (secondary ? " secondary" : "")} {...props}>
      {children}
    </button>
  );
}

export function Heading({ title, subtitle, back }) {
  return (
    <div className="page-title">
      {back && (
        <a href={"#" + back} className="icon-btn" aria-label="ย้อนกลับ">
          <ArrowLeft size={21} />
        </a>
      )}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}
