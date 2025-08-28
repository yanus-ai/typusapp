import React, { useEffect, useState } from 'react';

// Import images statically for better build compatibility
import img1 from '@/assets/images/generated-background/0016fc00-b8b3-422e-9741-52da0f736705.webp';
import img2 from '@/assets/images/generated-background/03152f40-4653-40a3-8bea-fe329ba01ce6.webp';
import img3 from '@/assets/images/generated-background/04f1fee4-ff32-4ef5-9f49-a946b8fa25c9.png';
import img4 from '@/assets/images/generated-background/072b019d-2c2c-47f8-8d85-53dd0bf7edc7.jpg';
import img5 from '@/assets/images/generated-background/08342611-bd4a-420a-9e0a-ab38040649a6.webp';
import img6 from '@/assets/images/generated-background/08f3d7a2-6c8e-477d-a7a6-e26757f229ae.webp';
import img7 from '@/assets/images/generated-background/09ca9bd1-c8a9-4704-99e0-76107dd395d1.webp';
import img8 from '@/assets/images/generated-background/0c41cd00-766b-4690-af63-a4e3288f6437.webp';
import img9 from '@/assets/images/generated-background/193a2b0b-657a-4add-98a8-19f3ed69b834.jpg';
import img10 from '@/assets/images/generated-background/219420f4-9e75-4097-b8e9-ece8147ce0df.png';
import img11 from '@/assets/images/generated-background/22c3daa0-4946-40f1-975c-b79def507b09.webp';
import img12 from '@/assets/images/generated-background/28bccd8d-50ec-4688-b636-f365d708a71c.png';
import img13 from '@/assets/images/generated-background/29257a06-4539-408e-b762-eef7609e040e.webp';
import img14 from '@/assets/images/generated-background/2f611417-814b-4ce7-8f7d-7629939fa5b6.jpg';
import img15 from '@/assets/images/generated-background/33859524-c05a-449b-a79b-47efa5989538.jpg';
import img16 from '@/assets/images/generated-background/3b15436a-8845-4f9d-a37c-02237745c0db.webp';
import img17 from '@/assets/images/generated-background/3de43c9f-ceb3-439e-9d76-337aa1a94372.png';
import img18 from '@/assets/images/generated-background/444bbc79-2656-4d82-92b6-7bf898289487.png';
import img19 from '@/assets/images/generated-background/44e5a8e5-4884-4394-9595-f66707c25b2f.jpg';
import img20 from '@/assets/images/generated-background/4558a600-fae5-4024-85e3-61fbc32990c9.png';
import img21 from '@/assets/images/generated-background/459d0871-ebda-4d2d-9a53-1df9fd15f67b.png';
import img22 from '@/assets/images/generated-background/47aba7fc-2440-4423-bc98-c06313d81143.png';
import img23 from '@/assets/images/generated-background/4b3673d5-2db1-43fc-a7a3-4539f315c85b.webp';
import img24 from '@/assets/images/generated-background/4d3bdb23-e0b3-4510-9d23-d7f3ca1ea266.jpg';
import img25 from '@/assets/images/generated-background/50966400-037e-4282-8625-ad03eb1c3c97.png';
import img26 from '@/assets/images/generated-background/5938d7e7-466d-426a-8030-a43fe9fb69c7.webp';
import img27 from '@/assets/images/generated-background/59e4eaeb-4aa2-4651-83a9-facdd15a388a.png';
import img28 from '@/assets/images/generated-background/5fc6baf1-94fe-4d01-b0f2-0e5cfb3f3b85.png';
import img29 from '@/assets/images/generated-background/6b0ef037-81d1-44e6-9f93-68f8c8aa3eb7.png';
import img30 from '@/assets/images/generated-background/6e31b539-fd93-475d-a5b0-29bf9a8efc9d.webp';
import img31 from '@/assets/images/generated-background/723eca59-4bb2-4532-88da-90efaf77b184.webp';
import img32 from '@/assets/images/generated-background/75c2dc70-2937-4163-9945-363d89bca353.webp';
import img33 from '@/assets/images/generated-background/787246d6-e343-48dc-9446-341a0e17153c.png';
import img34 from '@/assets/images/generated-background/79e7f4c6-7997-409d-b94e-5d8ee22b12e6.jpg';
import img35 from '@/assets/images/generated-background/7c52d051-acc7-4536-a037-b544210a5831.webp';
import img36 from '@/assets/images/generated-background/80f58629-f4f6-42e1-be28-113747d9a3e6.webp';
import img37 from '@/assets/images/generated-background/8429ac3e-6452-430c-a1f6-3989e47f7b0a.jpg';
import img38 from '@/assets/images/generated-background/8acc9b29-5037-449a-ae82-28d8ec750a12.webp';
import img39 from '@/assets/images/generated-background/8ca113f0-48a7-43bf-9307-00bf9398584b.webp';
import img40 from '@/assets/images/generated-background/8e2d43dc-78d9-4e59-9a13-2f3f0bfd4498.webp';
import img41 from '@/assets/images/generated-background/8f0ee53b-4b1b-456d-aa7d-d974f0767072.webp';
import img42 from '@/assets/images/generated-background/9144dde5-d7a7-4ed7-8524-63b328127cbf.png';
import img43 from '@/assets/images/generated-background/91eedb88-e1c5-46d7-8d3e-85dbc6092a47.webp';
import img44 from '@/assets/images/generated-background/96e40dc4-079e-4814-8b19-504bcceade2b.png';
import img45 from '@/assets/images/generated-background/9901936a-d800-473e-b1d5-3a12b5163c9f.png';
import img46 from '@/assets/images/generated-background/a185b9eb-bb2b-489b-bf20-8b193c38f0ab.png';
import img47 from '@/assets/images/generated-background/a3c6d4ed-6754-4529-bf0c-383b81c31b68.jpg';
import img48 from '@/assets/images/generated-background/a55d01be-4208-4bdc-ba2a-24cba0aedbc8.webp';
import img49 from '@/assets/images/generated-background/a986816f-e5d4-4b01-9e90-b1c6840a14b3.jpg';
import img50 from '@/assets/images/generated-background/aa66692f-481f-4608-9749-4981b2122939.jpg';
import img51 from '@/assets/images/generated-background/b5949fbf-39fd-4cc2-a134-eeba57edbd09.webp';
import img52 from '@/assets/images/generated-background/b86e721f-c692-4ecd-af6a-c77eddaba783.webp';
import img53 from '@/assets/images/generated-background/bc992570-7516-4636-8231-b70ccd21d707.png';
import img54 from '@/assets/images/generated-background/c0366bc9-4f17-4a56-a118-20e21e65bc2f.webp';
import img55 from '@/assets/images/generated-background/c646e773-f7c2-402e-a5db-d931ce8d6530.webp';
import img56 from '@/assets/images/generated-background/c75adfce-a970-48d9-917c-5974765bfad5.jpg';
import img57 from '@/assets/images/generated-background/c8151c17-7828-4ab2-a810-5065a8c0b0e3.png';
import img58 from '@/assets/images/generated-background/ce12506f-1e28-4c21-8b25-609ac13e8aa5.webp';
import img59 from '@/assets/images/generated-background/cf7eb6f7-5832-4650-af1a-bee9f5eadd76.png';
import img60 from '@/assets/images/generated-background/d07d8d00-b76d-40b0-a77f-66153a812830.jpg';
import img61 from '@/assets/images/generated-background/da6322d0-be96-4735-990f-7330e00f41f9.png';
import img62 from '@/assets/images/generated-background/db689b88-ceff-4055-bb88-708d74922e9e.webp';
import img63 from '@/assets/images/generated-background/dbea05aa-4e3f-4ea8-8b52-c952a75fd427.webp';
import img64 from '@/assets/images/generated-background/de8fac7e-73c1-4028-97a7-afa34bdafc77.webp';
import img65 from '@/assets/images/generated-background/debbc0e2-9150-403a-a941-614b555e99cd.webp';
import img66 from '@/assets/images/generated-background/debcc614-8c32-4f49-a9c9-3b081afa416e.webp';
import img67 from '@/assets/images/generated-background/e0a06dbf-a870-4adb-978b-7528b8ac5ca4.png';
import img68 from '@/assets/images/generated-background/e18d61d2-e456-4aaa-ac79-c525af19a935.webp';
import img69 from '@/assets/images/generated-background/e21635b7-9cd0-43af-8f57-eb5be4f97911.jpg';
import img70 from '@/assets/images/generated-background/e5465514-8fcc-46f9-ba01-17b6ca36dfb7.webp';
import img71 from '@/assets/images/generated-background/e6596f8f-004d-43e9-ac87-9157e02f3eb8.webp';
import img72 from '@/assets/images/generated-background/e861e6b6-2ac1-4deb-b63b-30d41f075dba.webp';
import img73 from '@/assets/images/generated-background/e91f2bf7-898c-4990-8dfa-8d9605da465d.jpg';
import img74 from '@/assets/images/generated-background/e9438ba5-6ebe-475e-8ff0-bb67cabfd78d.webp';
import img75 from '@/assets/images/generated-background/f01fe259-f947-458e-bfa4-2dfbc610d775.png';
import img76 from '@/assets/images/generated-background/f6afcefb-9616-4c29-b660-dcda69d09a1a.webp';
import img77 from '@/assets/images/generated-background/fbb4e4b9-f848-4a26-86bb-2c6e0a2d77f8.webp';
import img78 from '@/assets/images/generated-background/fbc2f476-a1e0-4983-a3e7-56f3b0a9591b.jpg';
import img79 from '@/assets/images/generated-background/fbe05fbd-079d-4d9c-9279-1796577481b5.webp';

// Array of all imported images
const imageUrls = [
  img1, img2, img3, img4, img5, img6, img7, img8, img9, img10,
  img11, img12, img13, img14, img15, img16, img17, img18, img19, img20,
  img21, img22, img23, img24, img25, img26, img27, img28, img29, img30,
  img31, img32, img33, img34, img35, img36, img37, img38, img39, img40,
  img41, img42, img43, img44, img45, img46, img47, img48, img49, img50,
  img51, img52, img53, img54, img55, img56, img57, img58, img59, img60,
  img61, img62, img63, img64, img65, img66, img67, img68, img69, img70,
  img71, img72, img73, img74, img75, img76, img77, img78, img79
];

interface MasonryBackgroundProps {
  className?: string;
  opacity?: number;
}

export const MasonryBackground: React.FC<MasonryBackgroundProps> = ({ 
  className = "", 
  opacity = 0.1 
}) => {
  const [loadedImages, setLoadedImages] = useState<string[]>([]);

  useEffect(() => {
    // Load all images immediately for maximum coverage
    const loadAllImages = () => {
      setLoadedImages(imageUrls);
    };

    loadAllImages();
  }, []);

  return (
    <div 
      className={`fixed inset-0 -z-10 overflow-hidden ${className}`}
      style={{ opacity }}
    >
      {/* Light background instead of dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
      
      {/* Masonry Grid - Full Coverage */}
      <div className="columns-3 sm:columns-4 md:columns-5 lg:columns-6 xl:columns-7 2xl:columns-8 gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 h-full min-h-screen">
        {loadedImages.map((imageUrl, index) => (
          <div
            key={`${imageUrl}-${index}`}
            className="break-inside-avoid mb-2 sm:mb-3 md:mb-4 relative group"
            style={{
              animationDelay: `${index * 0.05}s`,
            }}
          >
            <img
              src={imageUrl}
              alt=""
              className="w-full h-auto rounded-md sm:rounded-lg transition-all duration-500 ease-in-out 
                         transform group-hover:scale-105 group-hover:z-10
                         opacity-95 hover:opacity-100 shadow-md hover:shadow-xl"
              style={{
                aspectRatio: index % 3 === 0 ? '3/4' : index % 3 === 1 ? '4/3' : '1/1',
                objectFit: 'cover',
                minHeight: '120px'
              }}
              loading="lazy"
            />
            {/* Subtle overlay only on hover for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent rounded-md sm:rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
        
        {/* Duplicate images for seamless coverage */}
        {loadedImages.map((imageUrl, index) => (
          <div
            key={`duplicate-${imageUrl}-${index}`}
            className="break-inside-avoid mb-2 sm:mb-3 md:mb-4 relative group"
            style={{
              animationDelay: `${(index + loadedImages.length) * 0.05}s`,
            }}
          >
            <img
              src={imageUrl}
              alt=""
              className="w-full h-auto rounded-md sm:rounded-lg transition-all duration-500 ease-in-out 
                         transform group-hover:scale-105 group-hover:z-10
                         opacity-90 hover:opacity-100 shadow-md hover:shadow-xl"
              style={{
                aspectRatio: (index + 1) % 3 === 0 ? '4/3' : (index + 1) % 3 === 1 ? '1/1' : '3/4',
                objectFit: 'cover',
                minHeight: '120px'
              }}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent rounded-md sm:rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>
      
      {/* Very minimal overlay for login form readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5" />
    </div>
  );
};
