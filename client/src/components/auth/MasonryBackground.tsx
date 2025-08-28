import React, { useEffect, useState } from 'react';

const imageUrls = [
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/8acc9b29-5037-449a-ae82-28d8ec750a12.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/28bccd8d-50ec-4688-b636-f365d708a71c.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/de8fac7e-73c1-4028-97a7-afa34bdafc77.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/da6322d0-be96-4735-990f-7330e00f41f9.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/5938d7e7-466d-426a-8030-a43fe9fb69c7.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/a986816f-e5d4-4b01-9e90-b1c6840a14b3.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/0c41cd00-766b-4690-af63-a4e3288f6437.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/8429ac3e-6452-430c-a1f6-3989e47f7b0a.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/3b15436a-8845-4f9d-a37c-02237745c0db.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/96e40dc4-079e-4814-8b19-504bcceade2b.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/c0366bc9-4f17-4a56-a118-20e21e65bc2f.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/47aba7fc-2440-4423-bc98-c06313d81143.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/7c52d051-acc7-4536-a037-b544210a5831.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/aa66692f-481f-4608-9749-4981b2122939.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/e861e6b6-2ac1-4deb-b63b-30d41f075dba.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/33859524-c05a-449b-a79b-47efa5989538.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/db689b88-ceff-4055-bb88-708d74922e9e.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/04f1fee4-ff32-4ef5-9f49-a946b8fa25c9.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/75c2dc70-2937-4163-9945-363d89bca353.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/c8151c17-7828-4ab2-a810-5065a8c0b0e3.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/e9438ba5-6ebe-475e-8ff0-bb67cabfd78d.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/a3c6d4ed-6754-4529-bf0c-383b81c31b68.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/09ca9bd1-c8a9-4704-99e0-76107dd395d1.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/6b0ef037-81d1-44e6-9f93-68f8c8aa3eb7.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/0016fc00-b8b3-422e-9741-52da0f736705.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/cf7eb6f7-5832-4650-af1a-bee9f5eadd76.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/debbc0e2-9150-403a-a941-614b555e99cd.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/9901936a-d800-473e-b1d5-3a12b5163c9f.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/723eca59-4bb2-4532-88da-90efaf77b184.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/50966400-037e-4282-8625-ad03eb1c3c97.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/fbb4e4b9-f848-4a26-86bb-2c6e0a2d77f8.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/fbc2f476-a1e0-4983-a3e7-56f3b0a9591b.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/29257a06-4539-408e-b762-eef7609e040e.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/e0a06dbf-a870-4adb-978b-7528b8ac5ca4.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/e18d61d2-e456-4aaa-ac79-c525af19a935.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/bc992570-7516-4636-8231-b70ccd21d707.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/ce12506f-1e28-4c21-8b25-609ac13e8aa5.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/2f611417-814b-4ce7-8f7d-7629939fa5b6.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/fbe05fbd-079d-4d9c-9279-1796577481b5.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/a185b9eb-bb2b-489b-bf20-8b193c38f0ab.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/08f3d7a2-6c8e-477d-a7a6-e26757f229ae.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/3de43c9f-ceb3-439e-9d76-337aa1a94372.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/b86e721f-c692-4ecd-af6a-c77eddaba783.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/f01fe259-f947-458e-bfa4-2dfbc610d775.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/f6afcefb-9616-4c29-b660-dcda69d09a1a.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/787246d6-e343-48dc-9446-341a0e17153c.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/4b3673d5-2db1-43fc-a7a3-4539f315c85b.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/8ca113f0-48a7-43bf-9307-00bf9398584b.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/219420f4-9e75-4097-b8e9-ece8147ce0df.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/dbea05aa-4e3f-4ea8-8b52-c952a75fd427.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/5fc6baf1-94fe-4d01-b0f2-0e5cfb3f3b85.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/80f58629-f4f6-42e1-be28-113747d9a3e6.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/e21635b7-9cd0-43af-8f57-eb5be4f97911.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/22c3daa0-4946-40f1-975c-b79def507b09.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/d07d8d00-b76d-40b0-a77f-66153a812830.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/08342611-bd4a-420a-9e0a-ab38040649a6.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/79e7f4c6-7997-409d-b94e-5d8ee22b12e6.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/8e2d43dc-78d9-4e59-9a13-2f3f0bfd4498.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/c75adfce-a970-48d9-917c-5974765bfad5.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/8f0ee53b-4b1b-456d-aa7d-d974f0767072.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/459d0871-ebda-4d2d-9a53-1df9fd15f67b.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/6e31b539-fd93-475d-a5b0-29bf9a8efc9d.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/072b019d-2c2c-47f8-8d85-53dd0bf7edc7.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/b5949fbf-39fd-4cc2-a134-eeba57edbd09.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/4558a600-fae5-4024-85e3-61fbc32990c9.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/91eedb88-e1c5-46d7-8d3e-85dbc6092a47.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/e91f2bf7-898c-4990-8dfa-8d9605da465d.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/a55d01be-4208-4bdc-ba2a-24cba0aedbc8.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/444bbc79-2656-4d82-92b6-7bf898289487.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/e6596f8f-004d-43e9-ac87-9157e02f3eb8.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/4d3bdb23-e0b3-4510-9d23-d7f3ca1ea266.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/e5465514-8fcc-46f9-ba01-17b6ca36dfb7.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/193a2b0b-657a-4add-98a8-19f3ed69b834.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/03152f40-4653-40a3-8bea-fe329ba01ce6.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/9144dde5-d7a7-4ed7-8524-63b328127cbf.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/c646e773-f7c2-402e-a5db-d931ce8d6530.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/59e4eaeb-4aa2-4651-83a9-facdd15a388a.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/debcc614-8c32-4f49-a9c9-3b081afa416e.jpg',
  'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/44e5a8e5-4884-4394-9595-f66707c25b2f.jpg'
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Load all images immediately for maximum coverage
    const loadAllImages = () => {
      setLoadedImages(imageUrls);
    };

    loadAllImages();
  }, []);

  useEffect(() => {
    // Rotate through images slowly
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % imageUrls.length);
    }, 5000); // Change image every 5 seconds for more dynamic feel

    return () => clearInterval(interval);
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
