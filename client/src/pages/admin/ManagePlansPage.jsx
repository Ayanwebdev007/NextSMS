import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useAuth } from "../../hooks/useAuth";
import { LoaderCircle, PlusCircle, Edit } from "lucide-react";
import Modal from "../../components/ui/Modal";
// 1. Import the centralized API helper instead of axios directly
import { createAuthenticatedApi } from "../../services/api";

// 2. The local createApi helper has been removed.

const ManagePlansPage = () => {
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm();

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      // 3. Use the production-ready API service
      const api = createAuthenticatedApi(token);
      const response = await api.get("/admin/plans");
      setPlans(response.data);
    } catch {
      toast.error("Could not load plans.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (editingPlan) {
      setValue("name", editingPlan.name);
      setValue("price", editingPlan.price / 100);
      setValue("credits", editingPlan.credits);
      setValue("validityDays", editingPlan.validityDays);
      setValue("isActive", editingPlan.isActive);
    } else {
      reset();
    }
  }, [editingPlan, setValue, reset]);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    reset();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    const toastId = toast.loading(
      editingPlan ? "Updating plan..." : "Creating new plan..."
    );
    const api = createAuthenticatedApi(token);
    const planData = {
      name: data.name,
      price: parseFloat(data.price) * 100,
      credits: parseInt(data.credits),
      validityDays: parseInt(data.validityDays),
      isActive: data.isActive,
    };

    try {
      if (editingPlan) {
        await api.put(`/admin/plans/${editingPlan._id}`, planData);
        toast.success("Plan updated successfully!", { id: toastId });
      } else {
        await api.post("/admin/plans", planData);
        toast.success("Plan created successfully!", { id: toastId });
      }
      reset();
      setIsModalOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to save plan.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderCircle size={32} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Manage Plans
        </h1>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          <PlusCircle size={20} />
          Create New Plan
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-800">
            <thead className="bg-neutral-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                  Price (INR)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                  Credits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {plans.map((plan) => (
                <tr key={plan._id} className="hover:bg-neutral-800/50">
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {plan.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-300">
                    ₹{(plan.price / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-300">
                    {plan.credits.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        plan.isActive
                          ? "bg-green-900 text-green-300"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => handleOpenEditModal(plan)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
                    >
                      <Edit size={16} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? "Edit Plan" : "Create New Plan"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-neutral-300"
            >
              Plan Name
            </label>
            <input
              type="text"
              {...register("name", { required: "Name is required" })}
              className="mt-1 block w-full bg-neutral-800 border-neutral-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-neutral-300"
            >
              Price (in INR)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("price", {
                required: "Price is required",
                valueAsNumber: true,
                min: 0,
              })}
              className="mt-1 block w-full bg-neutral-800 border-neutral-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            />
            {errors.price && (
              <p className="text-red-500 text-xs mt-1">
                {errors.price.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="credits"
                className="block text-sm font-medium text-neutral-300"
              >
                Credits
              </label>
              <input
                type="number"
                {...register("credits", {
                  required: "Credits are required",
                  valueAsNumber: true,
                  min: 1,
                })}
                className="mt-1 block w-full bg-neutral-800 border-neutral-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
              {errors.credits && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.credits.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="validityDays"
                className="block text-sm font-medium text-neutral-300"
              >
                Validity (Days)
              </label>
              <input
                type="number"
                {...register("validityDays", {
                  required: "Validity is required",
                  valueAsNumber: true,
                  min: 1,
                })}
                className="mt-1 block w-full bg-neutral-800 border-neutral-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
              {errors.validityDays && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.validityDays.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register("isActive")}
              id="isActive"
              className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <label
              htmlFor="isActive"
              className="ml-2 block text-sm text-neutral-300"
            >
              Set plan as active
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isSubmitting
              ? editingPlan
                ? "Saving..."
                : "Creating..."
              : editingPlan
              ? "Save Changes"
              : "Create Plan"}
          </button>
        </form>
      </Modal>
    </>
  );
};

export default ManagePlansPage;
