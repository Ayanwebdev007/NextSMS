import React from "react";
import ConnectionCard from "../components/dashboard/ConnectionCard";
import AccountInfoCard from "../components/dashboard/AccountInfo";
import StartCampaignCard from "../components/dashboard/CampaignCard";
import PlanPurchasedCard from "../components/dashboard/PlanPurchased";
import { useAuth } from "../hooks/useAuth";
const DashboardOverviewPage = () => {
  const { user, isLoading } = useAuth();
  const renderGreeting = () => {
    if (isLoading) {
      return "Loading...";
    }
    if (user) {
      return (
        <>
          Hello,{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
            {user.name.split(" ")[1]}
          </span>
        </>
      );
    }
    return "Welcome to your Dashboard";
  };

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 pt-16">
        {renderGreeting()}
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <ConnectionCard />
        <StartCampaignCard />
        <AccountInfoCard />
        <PlanPurchasedCard />
      </div>
    </>
  );
};

export default DashboardOverviewPage;
