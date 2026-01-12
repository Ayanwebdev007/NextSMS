import React from "react";
import { X } from "lucide-react";
import ReactDOM from "react-dom";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";

const Modal = ({ isOpen, onClose, title, children }) => {
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl w-full max-w-sm p-6 text-white relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-1">
              <img src="/Logo2.png" alt="NextSMS Logo" className="h-12 w-auto" />
            </div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
             <div className=" flex flex-col justify-center items-center">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    // 3. This tells React to render the modal inside your #portal-root div
    document.getElementById("portal-root")
  );
};

export default Modal;
