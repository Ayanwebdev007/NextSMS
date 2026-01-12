import React from "react";
import { Link } from "react-router-dom";
import { HeroParallax } from "../components/ui/hero-parallax";
import { BentoGrid, BentoGridItem } from "../components/ui/bento-grid";
import { useAuth } from "../hooks/useAuth";

// Placeholder component for Bento Grid headers
const Skeleton = ({ imgSrc, altText }) => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl overflow-hidden">
    <img
      src={imgSrc}
      alt={altText}
      className="w-full h-full object-cover object-center group-hover/bento:scale-105 transition-transform duration-200"
    />
  </div>
);

const items = [
  {
    title: "Bulk Campaigns via CSV",
    description:
      "Effortlessly send thousands of messages by uploading a simple CSV file. No more copy-pasting.",
    // FIX: Replaced icon with an image. Replace the src with your own image path from the /public folder.
    header: (
      <Skeleton
        imgSrc="https://allthings.how/content/images/wordpress/2021/09/allthings.how-what-is-a-csv-file-and-how-to-open-or-create-it-csv-file.png"
        altText="CSV Upload illustration"
      />
    ),
    className: "md:col-span-2",
  },
  {
    title: "Simple Developer API",
    description:
      "Integrate WhatsApp messaging into your own applications with our simple REST API.",
    header: (
      <Skeleton
        imgSrc="https://www.stackct.com/wp-content/uploads/2022/06/BLOG_API-Large-1024x492.png.webp"
        altText="Developer API illustration"
      />
    ),
    className: "md:col-span-1",
  },
  {
    title: "Real-time Analytics",
    description:
      "Track the status of your campaigns and individual messages with a clear and concise dashboard.",
    header: (
      <Skeleton
        imgSrc="https://www.intellicus.com/wp-content/uploads/2021/02/realtime-blog.jpg"
        altText="Analytics dashboard illustration"
      />
    ),
    className: "md:col-span-1",
  },
  {
    title: "Safe & Secure",
    description:
      "Built-in delays and human-like sending patterns to protect your account.",
    header: (
      <Skeleton
        imgSrc="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ22XgBWuec3JH-ic35gTnuboNbt8X-o3gS7257J_WdBZK-FxuwXvaNLyJASKnKtGn-vbo&usqp=CAU"
        altText="Security shield illustration"
      />
    ),
    className: "md:col-span-2",
  },
];

// Data for the Hero Parallax section (mock products)
const products = [
  {
    title: "About Us",
    link: "/about",
    thumbnail:
      "https://t4.ftcdn.net/jpg/08/78/40/31/240_F_878403121_kfm3q1kal1XrbLzNcNar3kM8LtYfAX6v.webp",
  },
  {
    title: "Campaigns",
    link: "/dashboard/campaigns",
    thumbnail:
      "https://www.gatescambridge.org/wp-content/uploads/2025/05/tech.png",
  },
  {
    title: "Analytics",
    link: "/dashboard/outbox",
    thumbnail:
      "https://t4.ftcdn.net/jpg/15/15/17/65/240_F_1515176555_iSRnQUZjeZtbYdHp6dc6MMBBPSKDyAhV.jpg",
  },
  {
    title: "API Docs",
    link: "/dashboard/api",
    thumbnail:
      "https://t3.ftcdn.net/jpg/06/19/84/60/240_F_619846003_hoFcNxDt7vqN4AAeK3oi6YR4Azi6FLns.jpg",
  },
  {
    title: "Status Page",
    link: "/dashboard/outbox",
    thumbnail:
      "https://t4.ftcdn.net/jpg/05/87/83/19/240_F_587831960_HYDhoQag023Bh4PIUxO0OOvvNxnW8lc3.jpg",
  },
  {
    title: "Pricing",
    link: "/pricing",
    thumbnail:
      "https://media.licdn.com/dms/image/v2/D4D12AQHWxDKoqKUIyA/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1687163197544?e=2147483647&v=beta&t=uO421mlN3Q0mDL1Y5397CM6ssQQd-hWpB9TNDlN49vI",
  },
  {
    title: "Contact",
    link: "/contact",
    thumbnail:
      "https://www.shutterstock.com/image-photo/using-laptop-show-icon-address-600nw-2521386695.jpg",
  },
  {
    title: "Login",
    link: "/login",
    thumbnail:
      "https://t4.ftcdn.net/jpg/07/10/56/45/240_F_710564562_wDFJTyTkEI1u9PVWCDJjoqbosXAt5tvi.jpg",
  },
  {
    title: "Register",
    link: "/register",
    thumbnail:
      "https://t4.ftcdn.net/jpg/02/58/86/97/240_F_258869730_KSydnAki0M5lBLRthoTtCfIxkwhA5VzF.jpg",
  },
  {
    title: "Dashboard",
    link: "/dashboard",
    thumbnail:
      "https://t3.ftcdn.net/jpg/05/68/74/42/240_F_568744254_h0ASiAvZiHypQlxiy0P3Cug7W5aLO9ac.jpg",
  },
];

const HomePage = () => {
  const { token } = useAuth();
  return (
    <div className="bg-neutral-950 text-white">
     
      {/* The HeroParallax component from Aceternity is generally responsive by design */}
      <HeroParallax products={products} />

      {/* The main content area with responsive padding */}
      <div className="px-2 sm:px-6 lg:px-8">
        {/* Features Section */}
        <div className="max-w-7xl mx-auto antialiased  relative">
          <div className="text-center mt-12 md:mt-20 mb-12">
            {/* Responsive heading sizes */}
            <h2 className="text-4xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
              Powerful Features,{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
                Simplified
                
              </span>
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto mt-4 text-base md:text-lg">
              Everything you need to run professional WhatsApp campaigns with
              ease.
            </p>
          </div>

          {/* The BentoGrid is responsive by nature, stacking on smaller screens */}
          <BentoGrid className="max-w-5xl mx-auto md:auto-rows-[20rem]">
            {items.map((item, i) => (
              <BentoGridItem
                key={i}
                title={item.title}
                description={item.description}
                isiliye
                header={item.header}
                className={item.className}
                icon={item.icon}
              />
            ))}
          </BentoGrid>
        </div>

        {/* Call to Action Section */}
        <div className="text-center py-20 md:py-32">
          {/* Responsive heading sizes */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">
            Ready to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500 ">
              Connect?
            </span>
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto mt-4 text-base md:text-lg">
            Join NextSMS today and transform how you communicate with your
            customers.
          </p>
          <Link
            to={token ? "/dashboard" : "/register"}
            className="mt-8 inline-block bg-gradient-to-br from-cyan-500 to-indigo-500 text-white px-8 py-3 rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
          >
            {token ? "Go to Dashboard" : "Get Started for Free"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
