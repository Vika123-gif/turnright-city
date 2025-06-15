
import React from "react";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: "primary" | "outline";
};

const Button = ({ variant = "primary", children, className, ...props }: ButtonProps) => (
  <button
    className={[
      variant === "primary" ? "primary-btn" : "outline-btn",
      "transition-all",
      className || ""
    ].join(" ")}
    {...props}
  >
    {children}
  </button>
);
export default Button;
