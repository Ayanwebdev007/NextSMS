"use client";
import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom"; // Use Link for client-side routing

export const HeroParallax = ({ products }) => {
  const firstRow = products.slice(0, 5);
  const secondRow = products.slice(5, 10);
  const thirdRow = products.slice(10, 15);
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1000]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [0.2, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [-700, 500]),
    springConfig
  );
  return (
    <div
      ref={ref}
      className="h-[190vh] md:h-[300vh] py-20 sm:py-50 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
    >
      <Header />
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
      >
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-10 md:space-x-20 mb-10 md:mb-20">
          {firstRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row mb-10 md:mb-20 space-x-10 md:space-x-20">
          {secondRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateXReverse}
              key={product.title}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-10 md:space-x-20">
          {thirdRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const Header = () => {
  return (
    <div className="max-w-7xl relative mx-auto px-4 py-8 sm:py-16 md:py-32 w-full left-0 top-0 text-center sm:text-left">
      {/* Responsive font sizes */}
      <h1 className="text-5xl sm:text-5xl md:text-7xl font-bold dark:text-white leading-tight">
        <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
          Smarter
        </span>{" "}
        Messaging <br className="hidden sm:block" /> for Modern{" "}
        <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
          Businesses
        </span>
      </h1>
      <p className="max-w-xl sm:max-w-2xl text-sm sm:text-base md:text-xl mt-6 sm:mt-8 mx-auto sm:mx-0 dark:text-neutral-200">
        With NextSMS, reach your customers instantly on WhatsApp. Run personalized bulk campaigns with just a CSV file or seamlessly integrate our API into your systems. Simple, fast, and built to scale your communication.
      </p>
    </div>
  );
};

export const ProductCard = ({ product, translate }) => {
  return (
    <motion.div
      style={{ x: translate }}
      whileHover={{ y: -10 }}
      key={product.title}
      className="group/product relative shrink-0 h-56 w-40 sm:h-72 sm:w-56 md:h-96 md:w-[30rem] rounded-xl overflow-hidden"
    >
      <Link
        to={product.link}
        className="block group-hover/product:shadow-2xl h-full w-full"
      >
        <img
          src={product.thumbnail}
          height="600"
          width="600"
          className="object-cover absolute h-full w-full inset-0 transition-transform duration-300 group-hover/product:scale-105"
          alt={product.title}
        />
      </Link>
      <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-70 bg-black transition duration-300 pointer-events-none"></div>
      <h2 className="absolute bottom-3 left-3 text-xs sm:text-base md:text-lg font-semibold opacity-0 group-hover/product:opacity-100 text-white transition duration-300">
        {product.title}
      </h2>
    </motion.div>
  );
};
