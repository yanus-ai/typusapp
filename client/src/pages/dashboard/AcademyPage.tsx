import { FC } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import create1 from '@/assets/tutorials/create1.png';
import create2 from '@/assets/tutorials/create2.png';
import create3 from '@/assets/tutorials/create3.png';
import edit1 from '@/assets/tutorials/edit1.png';
import edit2 from '@/assets/tutorials/edit2.png';
import edit3 from '@/assets/tutorials/edit3.png';
import overview1 from '@/assets/tutorials/overview1.png';
import overview2 from '@/assets/tutorials/overview2.png';
import overview3 from '@/assets/tutorials/overview3.png';
import upscale1 from '@/assets/tutorials/upscale1.png';
import upscale2 from '@/assets/tutorials/upscale2.png';
import upscale3 from '@/assets/tutorials/upscale3.png';

const carousels = [
   {
      title: 'Overview',
      images: [
         {
            src: overview1,
            title: 'Nano Banana Image Editor',
            description: 'Free AI photo editing with Nano Banana.',
            link: 'https://app.typus.ai'
         },
         {
            src: overview2,
            title: 'Another Title',
            description: 'Another description.',
            link: 'https://app.typus.ai'
         },
         {
            src: overview3,
            title: 'Third Title',
            description: 'Third description.',
            link: 'https://app.typus.ai'
         }
      ]
   },
   {
      title: 'Create',
      images: [
         {
            src: create1,
            title: 'Create Title 1',
            description: 'Create description 1.',
            link: 'https://app.typus.ai'
         },
         {
            src: create2,
            title: 'Create Title 2',
            description: 'Create description 2.',
            link: 'https://app.typus.ai'
         },
         {
            src: create3,
            title: 'Create Title 3',
            description: 'Create description 3.',
            link: 'https://app.typus.ai'
         }
      ]
   },
   {
      title: 'Edit',
      images: [
         {
            src: edit1,
            title: 'Edit Title 1',
            description: 'Edit description 1.',
            link: 'https://app.typus.ai'
         },
         {
            src: edit2,
            title: 'Edit Title 2',
            description: 'Edit description 2.',
            link: 'https://app.typus.ai'
         },
         {
            src: edit3,
            title: 'Edit Title 3',
            description: 'Edit description 3.',
            link: 'https://app.typus.ai'
         }
      ]
   },
   {
      title: 'Upscale',
      images: [
         {
            src: upscale1,
            title: 'Upscale Title 1',
            description: 'Upscale description 1.',
            link: 'https://app.typus.ai'
         },
         {
            src: upscale2,
            title: 'Upscale Title 2',
            description: 'Upscale description 2.',
            link: 'https://app.typus.ai'
         },
         {
            src: upscale3,
            title: 'Upscale Title 3',
            description: 'Upscale description 3.',
            link: 'https://app.typus.ai'
         }
      ]
   }
];

const AcademyPage: FC = () => {
   return (
      <MainLayout>
         <Sidebar />
         <div className="w-full space-y-6 p-6 flex-1 overflow-auto">
            {carousels.map((carousel, carouselIndex) => (
               <Carousel key={carouselIndex} opts={{ align: "start" }} className="w-full">
                  <div className="flex mb-4 items-center justify-between">
                     <p className='text-xl font-semibold'>
                        {carousel.title}
                     </p>
                     <div className="flex gap-2 items-center">
                        <CarouselPrevious /> <CarouselNext />
                     </div>
                  </div>
                  <CarouselContent>
                     {carousel.images.map((image, index) => (
                        <CarouselItem key={index} className="md:basis-1/3 lg:basis-1/4">
                           <a href={image.link} target='_blank'>
                              <div className='aspect-[5/7] mb-4 rounded-md overflow-hidden'>
                                 <img src={image.src} className='object-cover size-full' alt={image.title} />
                              </div>
                              <p className='text-lg font-semibold'>{image.title}</p>
                              <p className='opacity-75'>
                                 {image.description}
                              </p>
                           </a>
                        </CarouselItem>
                     ))}
                  </CarouselContent>
               </Carousel>
            ))}
            <div className="my-20 lg:my-32 text-center px-4">
               <p className='text-3xl max-w-[40ch] mx-auto md:text-4xl lg:text-5xl'>CASE STUDIES FROM OUR EARLY ADOPTERS DURING OPEN BETA.</p>
               <p className="text-2xl max-w-[40ch] mx-auto mt-10 md:mt-20 hover:italic"><a href="https://www.linkedin.com/in/maximilian-wagner-041713226/">▌OUTPUT FROM 3D MODEL BY MAXIMILIAN WAGNER FROM MORGER & PARTNER.</a></p>
               <div className="flex mt-7 mx-auto justify-center flex-col gap-4 items-center max-w-[600px]">
                  <img loading="lazy" decoding="async" width="1024" height="331" src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-m6rm1mawanrj20ckzx0tkrtymm-1024x331.png" className="" alt="" srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-m6rm1mawanrj20ckzx0tkrtymm-1024x331.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-m6rm1mawanrj20ckzx0tkrtymm-300x97.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-m6rm1mawanrj20ckzx0tkrtymm-768x248.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-m6rm1mawanrj20ckzx0tkrtymm-1536x496.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-m6rm1mawanrj20ckzx0tkrtymm-2048x662.png 2048w" sizes="(max-width: 1024px) 100vw, 1024px" />
                  <img loading="lazy" decoding="async" width="594" height="592" src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205434.png" className="max-w-[190px]" alt="" srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205434.png 594w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205434-300x300.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205434-150x150.png 150w" sizes="(max-width: 594px) 100vw, 594px" />
               </div>
            </div>
            <div className="my-20 lg:my-32 text-center px-4">
               <p className="text-2xl max-w-[40ch] mx-auto mt-10 md:mt-20 hover:italic">
                  <a href="https://www.linkedin.com/in/friedrich-von-roth-9ba57022b/?originalSubdomain=de">
                     ▌OUTPUT FROM SCREENSHOT OF TEXTURED 3D MODEL BY FRIEDRICH ROTH
                  </a>
                  <a href="https://www.landschaft-id.de/">
                     <br className='md:hidden' />FROM THE LANDSCAPE FIRM LANDSCHAFT-ID.
                  </a>
               </p>
               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px]">
                  <img loading="lazy" decoding="async" width="422" height="231"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205450.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0"
                     alt="Original screenshot of textured 3D model"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205450.png 422w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205450-300x164.png 300w"
                     sizes="(max-width: 422px) 100vw, 422px" />
                  <img loading="lazy" decoding="async" width="1024" height="603"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-g3y3hvpk21rj20ckzx0an0n7p4-1024x603.png"
                     className="w-full max-w-[450px]"
                     alt="AI-generated photorealistic output"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-g3y3hvpk21rj20ckzx0an0n7p4-1024x603.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-g3y3hvpk21rj20ckzx0an0n7p4-300x177.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-g3y3hvpk21rj20ckzx0an0n7p4-768x453.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-g3y3hvpk21rj20ckzx0an0n7p4.png 1344w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>
            </div>
            <div className="my-20 lg:my-32 text-center px-4">
               <p className="text-2xl max-w-[40ch] mx-auto mt-10 md:mt-20 hover:italic">
                  <a href="https://www.linkedin.com/in/daniel-bernt-053513239/">
                     ▌OUTPUT FROM SCREENSHOT OF TEXTURED 3D MODEL BY ARCHITECT DANIEL BERNT
                  </a>
                  <a href="https://lka-ka.de/">
                     <br className='md:hidden' />FROM LENNERMANN KRÄMER ARCHITEKTEN PARTGMBB KARLSRUHE.
                  </a>
               </p>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-8">
                  <img loading="lazy" decoding="async" width="415" height="227"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205554.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0"
                     alt="Original screenshot 1 of textured 3D model"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205554.png 415w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205554-300x164.png 300w"
                     sizes="(max-width: 415px) 100vw, 415px" />

                  <img loading="lazy" decoding="async" width="1024" height="603"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-3jj2m23etxrj40ckzx698vvjcw-1-1024x603.png"
                     className="w-full max-w-[450px]"
                     alt="AI-generated photorealistic output 1"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-3jj2m23etxrj40ckzx698vvjcw-1-1024x603.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-3jj2m23etxrj40ckzx698vvjcw-1-300x177.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-3jj2m23etxrj40ckzx698vvjcw-1-768x453.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-3jj2m23etxrj40ckzx698vvjcw-1-1536x905.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-3jj2m23etxrj40ckzx698vvjcw-1.png 1792w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-8">
                  <img loading="lazy" decoding="async" width="413" height="229"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205504-1.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0"
                     alt="Original screenshot 2 of textured 3D model"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205504-1.png 413w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205504-1-300x166.png 300w"
                     sizes="(max-width: 413px) 100vw, 413px" />

                  <img loading="lazy" decoding="async" width="1024" height="588"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-2aemqah4c5rj60ckzx1a6kdxfc-1024x588.png"
                     className="w-full max-w-[450px]"
                     alt="AI-generated photorealistic output 2"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-2aemqah4c5rj60ckzx1a6kdxfc-1024x588.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-2aemqah4c5rj60ckzx1a6kdxfc-300x172.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-2aemqah4c5rj60ckzx1a6kdxfc-768x441.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-2aemqah4c5rj60ckzx1a6kdxfc.png 1352w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px]">
                  <img loading="lazy" decoding="async" width="416" height="230"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205543.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0"
                     alt="Original screenshot 3 of textured 3D model"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205543.png 416w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205543-300x166.png 300w"
                     sizes="(max-width: 416px) 100vw, 416px" />

                  <img loading="lazy" decoding="async" width="1024" height="610"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-acr6tgby81rj60ckzx3bzy8dd0-1-1024x610.png"
                     className="w-full max-w-[450px]"
                     alt="AI-generated photorealistic output 3"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-acr6tgby81rj60ckzx3bzy8dd0-1-1024x610.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-acr6tgby81rj60ckzx3bzy8dd0-1-300x179.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-acr6tgby81rj60ckzx3bzy8dd0-1-768x457.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-acr6tgby81rj60ckzx3bzy8dd0-1.png 1344w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>
            </div>
            <div className="my-20 lg:my-32 text-center px-4">
               <p className="text-2xl max-w-lg mx-auto mt-10 md:mt-20 hover:italic">
                  <a href="https://www.linkedin.com/in/finn-kratz-661649285/">
                     ▌OUTPUT FROM PHYSICAL MODEL & CRUMPLED PAPER. INTERN FINN KRATZ
                  </a>
                  <a href="https://behnisch.com/">
                     <br className='md:hidden' />AT BEHNISCH ARCHITEKTEN
                  </a>
               </p>

               <div className="flex mt-7 mx-auto justify-center flex-col gap-4 items-center max-w-[1000px] mb-8">
                  <div className='flex flex-col md:flex-row gap-4 items-start w-full justify-center'>
                     <img loading="lazy" decoding="async" width="410" height="283"
                        src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205608.png"
                        className="w-full max-w-[300px] shadow-lg"
                        alt="Original physical model input"
                        srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205608.png 410w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205608-300x207.png 300w"
                        sizes="(max-width: 410px) 100vw, 410px" />

                     <div className='flex flex-col md:flex-row gap-4 w-full md:w-auto'>
                        <img loading="lazy" decoding="async" width="1024" height="586"
                           src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-abd15rrk95rj20ckzx7b4rsmmw-1024x586.png"
                           className="w-full max-w-[450px] shadow-lg"
                           alt="AI output 1 from physical model"
                           srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-abd15rrk95rj20ckzx7b4rsmmw-1024x586.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-abd15rrk95rj20ckzx7b4rsmmw-300x172.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-abd15rrk95rj20ckzx7b4rsmmw-768x440.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-abd15rrk95rj20ckzx7b4rsmmw.png 1760w"
                           sizes="(max-width: 1024px) 100vw, 1024px" />

                        <img loading="lazy" decoding="async" width="1024" height="683"
                           src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-mrcrp8ahadrj20ckzx6rpycvz0-1024x683.png"
                           className="w-full max-w-[450px] shadow-lg"
                           alt="AI output 2 from physical model"
                           srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-mrcrp8ahadrj20ckzx6rpycvz0-1024x683.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-mrcrp8ahadrj20ckzx6rpycvz0-300x200.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-mrcrp8ahadrj20ckzx6rpycvz0-768x512.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-mrcrp8ahadrj20ckzx6rpycvz0-1536x1024.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-mrcrp8ahadrj20ckzx6rpycvz0.png 1776w"
                           sizes="(max-width: 1024px) 100vw, 1024px" />
                     </div>
                  </div>
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-8">
                  <img loading="lazy" decoding="async" width="421" height="331"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205957.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Original screenshot input"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205957.png 421w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205957-300x236.png 300w"
                     sizes="(max-width: 421px) 100vw, 421px" />

                  <img loading="lazy" decoding="async" width="1024" height="806"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-jwkfgj9gs5rj60ckzx8bv5dwag-1024x806.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-jwkfgj9gs5rj60ckzx8bv5dwag-1024x806.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-jwkfgj9gs5rj60ckzx8bv5dwag-300x236.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-jwkfgj9gs5rj60ckzx8bv5dwag-768x604.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-jwkfgj9gs5rj60ckzx8bv5dwag-1536x1209.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-jwkfgj9gs5rj60ckzx8bv5dwag.png 1728w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px]">
                  <img loading="lazy" decoding="async" width="398" height="245"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210010.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Original screenshot input"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210010.png 398w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210010-300x185.png 300w"
                     sizes="(max-width: 398px) 100vw, 398px" />

                  <img loading="lazy" decoding="async" width="1024" height="596"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-wsaa9wk76srj60ckzx7vy2ec8w-1024x596.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-wsaa9wk76srj60ckzx7vy2ec8w-1024x596.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-wsaa9wk76srj60ckzx7vy2ec8w-300x175.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-wsaa9wk76srj60ckzx7vy2ec8w-768x447.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-wsaa9wk76srj60ckzx7vy2ec8w-1536x894.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-wsaa9wk76srj60ckzx7vy2ec8w.png 1760w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>
            </div>
            <div className="my-20 lg:my-32 text-center px-4">
               <p className="text-2xl max-w-[40ch] mx-auto mt-10 md:mt-20 hover:italic">
                  <a href="https://www.linkedin.com/in/fabian-leeb-ab4032208/">
                     ▌OUTPUT FROM CAD IN A CONTEXTUAL PHOTO BY ARCHITECTURE STUDENT AT UNIVERSITY STUTTGART FABIAN LEEB AND INTERN
                  </a>
                  <a href="https://wohnartarchitekten.de/">
                     <br className='md:hidden' />AT WOHN-ART ARCHITEKTEN.
                  </a>
               </p>
               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px]">
                  <img loading="lazy" decoding="async" width="438" height="280"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205927.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Original CAD model in contextual photo input"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205927.png 438w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205927-300x192.png 300w"
                     sizes="(max-width: 438px) 100vw, 438px" />

                  <img loading="lazy" decoding="async" width="1024" height="741"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-f6k80f81r9rj60ckzxdvxf03nm-1024x741.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-f6k80f81r9rj60ckzxdvxf03nm-1024x741.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-f6k80f81r9rj60ckzxdvxf03nm-300x217.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-f6k80f81r9rj60ckzxdvxf03nm-768x556.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-f6k80f81r9rj60ckzxdvxf03nm-1536x1111.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-f6k80f81r9rj60ckzxdvxf03nm.png 1968w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>
            </div>
            <div className="my-20 lg:my-32 text-center px-4">
               <p className="text-2xl max-w-lg mx-auto mt-10 md:mt-20 hover:italic">
                  <a href="https://www.instagram.com/florian.vancoff/">
                     ▌OUTPUT FROM AN IMAGE AND FROM A COLORMAP OF A 3D MODEL BY ARCHITECTURE CREATOR FLORIAN VAN COFF.
                  </a>
               </p>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-8">
                  <img loading="lazy" decoding="async" width="443" height="321"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205941.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Original image input"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205941.png 443w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205941-300x217.png 300w"
                     sizes="(max-width: 443px) 100vw, 443px" />

                  <img loading="lazy" decoding="async" width="1024" height="758"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-9pzbdjgrx1rj20ckzxctwrfbdw-1024x758.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-9pzbdjgrx1rj20ckzxctwrfbdw-1024x758.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-9pzbdjgrx1rj20ckzxctwrfbdw-300x222.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-9pzbdjgrx1rj20ckzxctwrfbdw-768x568.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-9pzbdjgrx1rj20ckzxctwrfbdw-1536x1136.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-9pzbdjgrx1rj20ckzxctwrfbdw.png 1968w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px]">
                  <img loading="lazy" decoding="async" width="452" height="292"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205901.png"
                     className="w-full max-w-[300px] shadow-lg"
                     alt="Additional source image/photo"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205901.png 452w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205901-300x194.png 300w"
                     sizes="(max-width: 452px) 100vw, 452px" />

                  <img loading="lazy" decoding="async" width="426" height="289"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-204240.png"
                     className="w-full max-w-[300px] shadow-lg"
                     alt="Colormap or depth map input"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-204240.png 426w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-204240-300x204.png 300w"
                     sizes="(max-width: 426px) 100vw, 426px" />
               </div>
            </div>
            <div className="my-20 lg:my-32 text-center px-4">
               <p className="text-2xl max-w-lg mx-auto mt-10 md:mt-20 hover:italic">
                  <a href="https://www.xing.com/profile/Olaf_Sigel">
                     ▌OUTPUT FROM COLORMAP BY 3D ARTIST OLAF SIGEL AT MEDIA4.
                  </a>
               </p>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-8">
                  <img loading="lazy" decoding="async" width="411" height="271"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205741.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Colormap input 1"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205741.png 411w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205741-300x198.png 300w"
                     sizes="(max-width: 411px) 100vw, 411px" />

                  <img loading="lazy" decoding="async" width="1024" height="726"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-h8418mnzjsrj60ckzx8sdz00c8-1024x726.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output 1"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-h8418mnzjsrj60ckzx8sdz00c8-1024x726.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-h8418mnzjsrj60ckzx8sdz00c8-300x213.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-h8418mnzjsrj60ckzx8sdz00c8-768x545.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-h8418mnzjsrj60ckzx8sdz00c8-1536x1089.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-h8418mnzjsrj60ckzx8sdz00c8.png 1760w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-8">
                  <img loading="lazy" decoding="async" width="415" height="222"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205710.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Colormap input 2"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205710.png 415w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205710-300x160.png 300w"
                     sizes="(max-width: 415px) 100vw, 415px" />

                  <img loading="lazy" decoding="async" width="1024" height="707"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-p4vqrea7jnrj40ckzx8t9c7k2m-1024x707.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output 2"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-p4vqrea7jnrj40ckzx8t9c7k2m-1024x707.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-p4vqrea7jnrj40ckzx8t9c7k2m-300x207.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-p4vqrea7jnrj40ckzx8t9c7k2m-768x531.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-p4vqrea7jnrj40ckzx8t9c7k2m-1536x1061.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-p4vqrea7jnrj40ckzx8t9c7k2m.png 1760w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px]">
                  <img loading="lazy" decoding="async" width="417" height="230"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205658.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Colormap input 3"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205658.png 417w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205658-300x165.png 300w"
                     sizes="(max-width: 417px) 100vw, 417px" />

                  <img loading="lazy" decoding="async" width="1024" height="581"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-5n88pk75h1rj00ckzx8b5ywqsr-1024x581.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output 3"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-5n88pk75h1rj00ckzx8b5ywqsr-1024x581.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-5n88pk75h1rj00ckzx8b5ywqsr-300x170.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-5n88pk75h1rj00ckzx8b5ywqsr-768x436.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-5n88pk75h1rj00ckzx8b5ywqsr-1536x872.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-5n88pk75h1rj00ckzx8b5ywqsr.png 1776w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>
            </div>
            <div className="my-20 lg:my-32 text-center px-4">
               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-12">
                  <img loading="lazy" decoding="async" width="451" height="261"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205915.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Source image input"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205915.png 451w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-205915-300x174.png 300w"
                     sizes="(max-width: 451px) 100vw, 451px" />

                  <img loading="lazy" decoding="async" width="1024" height="630"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-zawjyy4fj5rj60ckzxdb6z6dq0-1024x630.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-zawjyy4fj5rj60ckzxdb6z6dq0-1024x630.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-zawjyy4fj5rj60ckzxdb6z6dq0-300x184.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-zawjyy4fj5rj60ckzxdb6z6dq0-768x472.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-zawjyy4fj5rj60ckzxdb6z6dq0-1536x944.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-zawjyy4fj5rj60ckzxdb6z6dq0.png 1952w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-12">
                  <img loading="lazy" decoding="async" width="450" height="250"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210106.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Source image input 2"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210106.png 450w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210106-300x167.png 300w"
                     sizes="(max-width: 450px) 100vw, 450px" />

                  <img loading="lazy" decoding="async" width="1024" height="607"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-tcv31r6fwdrj40ckzxmbbst6ag-1111-1024x607.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output 2"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-tcv31r6fwdrj40ckzxmbbst6ag-1111-1024x607.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-tcv31r6fwdrj40ckzxmbbst6ag-1111-300x178.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-tcv31r6fwdrj40ckzxmbbst6ag-1111-768x456.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-tcv31r6fwdrj40ckzxmbbst6ag-1111-1536x911.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-tcv31r6fwdrj40ckzxmbbst6ag-1111.png 1888w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px] mb-12">
                  <img loading="lazy" decoding="async" width="418" height="258"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-214637.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Source image input 3"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-214637.png 418w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-214637-300x185.png 300w"
                     sizes="(max-width: 418px) 100vw, 418px" />

                  <img loading="lazy" decoding="async" width="1024" height="570"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-511jtbz9vhrj00ckzxase5jja4-1024x570.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output 3"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-511jtbz9vhrj00ckzxase5jja4-1024x570.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-511jtbz9vhrj00ckzxase5jja4-300x167.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-511jtbz9vhrj00ckzxase5jja4-768x427.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-511jtbz9vhrj00ckzxase5jja4-1536x855.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-511jtbz9vhrj00ckzxase5jja4.png 1696w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>

               <div className="flex mt-7 mx-auto justify-center flex-col md:flex-row gap-4 items-center max-w-[800px]">
                  <img loading="lazy" decoding="async" width="436" height="298"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210051.png"
                     className="w-full max-w-[300px] mb-4 md:mb-0 shadow-lg"
                     alt="Source image input 4"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210051.png 436w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/Screenshot-2024-12-25-210051-300x205.png 300w"
                     sizes="(max-width: 436px) 100vw, 436px" />

                  <img loading="lazy" decoding="async" width="1024" height="676"
                     src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-86t344vvw5rj00ckzxaajzdsng-1024x676.png"
                     className="w-full max-w-[450px] shadow-lg"
                     alt="AI-generated photorealistic output 4"
                     srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-86t344vvw5rj00ckzxaajzdsng-1024x676.png 1024w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-86t344vvw5rj00ckzxaajzdsng-300x198.png 300w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-86t344vvw5rj00ckzxaajzdsng-768x507.png 768w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-86t344vvw5rj00ckzxaajzdsng-1536x1014.png 1536w, https://h38.294.myftpupload.com/wp-content/uploads/2024/12/replicate-prediction-86t344vvw5rj00ckzxaajzdsng.png 1648w"
                     sizes="(max-width: 1024px) 100vw, 1024px" />
               </div>
            </div>
         </div>
      </MainLayout>
   );
};

export default AcademyPage;
