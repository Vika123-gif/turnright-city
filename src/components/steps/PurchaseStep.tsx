
import React from "react";
import Button from "../Button";

const PurchaseStep: React.FC = () => {
  return (
    <div className="chat-card text-center">
      <div className="text-3xl mb-5">✅</div>
      <div className="text-lg font-semibold mb-1">Thanks for your purchase!</div>
      <div className="mb-6 text-[#008457] font-medium">Here's your route link: <a href="#" className="underline text-[#00BC72]">View Route</a></div>
      <Button variant="primary" onClick={() => window.location.reload()}>Start New Search</Button>
    </div>
  );
};
export default PurchaseStep;
