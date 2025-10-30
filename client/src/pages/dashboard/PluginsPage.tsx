import { FC } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
// import archicad_th from '@/assets/Plugins/archicad_th.png';
// import revit_th from '@/assets/Plugins/revit_th.png';
// import sketchup_th from '@/assets/Plugins/sketchup_th.png';
// import rhino_th from '@/assets/Plugins/rhino_th.png';
// import archicad from '@/assets/Plugins/archicad.png';
import revit from '@/assets/Plugins/revit.png';
import sketchup from '@/assets/Plugins/sketchup.png';
import rhino from '@/assets/Plugins/rhino.png';
import archicad_logo from '@/assets/Plugins/archicad_plugin.png';

const PluginsPage: FC = () => {
   return (
      <MainLayout>
         <Sidebar />

         <div className="w-full space-y-6 p-6 flex-1 overflow-auto">
            <div>
               <h1 className="text-3xl font-semibold tracking-tight font-siggnal">Plugins</h1>
               <p className="text-sm text-gray-600">
                  This is plugins page of user
               </p>
            </div>

            <>
               <div className='px-4 my-16 lg:mb-28 container mx-auto text-center space-y-12'>
                  <h2 className='uppercase tracking-widest font-bold text-2xl'>
                     PLUGIN GUIDE.
                  </h2>
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1200px] mx-auto'>
                     <iframe className="aspect-video w-full" frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" title="PLUGIN Installation Guide | YANUS Connector" width="640" height="360" src="https://www.youtube.com/embed/Q1wp826FXSo?si=mtzwdDIcKTx5-JMN" id="widget2"></iframe>
                     <iframe className="aspect-video w-full" frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" title="PLUGIN Guide | YANUS Connector" width="640" height="360" src="https://www.youtube.com/embed/Jk307SKYgH4" id="widget3"></iframe>
                  </div>
                  {/* <iframe className="aspect-video mx-auto w-full max-w-[600px]" frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" title="PLUGIN Installation Guide | YANUS Connector" width="640" height="360" src="https://www.youtube.com/embed/98UF1bGRyfA?si=xt5QUOiz_hLVQrxz" id="widget2"></iframe> */}
               </div>
               <div className='grid lg:grid-cols-2 px-5 my-16 lg:my-28 container mx-auto max-lg:gap-10'>
                  <div className='text-center'>
                     <h1 className='text-xl md:text-2xl text-balance font-black uppercase'>
                        No. 1 App featured on Autodesk app store’s front page.
                     </h1>
                     <img className='max-w-32 mx-auto' src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/2pc4hQs6VxJGrP6aCdT07OyY87E.svg" alt="Autodesk" />
                     <img className='max-w-50 mx-auto' src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/2pc5ApDwnMACzMRnSkcHVB2TFER.svg" alt="Revit" />
                     <p className='uppercase font-light text-xs tracking-[0.2em] mb-3'>
                        Supported versions:
                     </p>
                     <p className='font-black tracking-[0.2em] text-xs mb-2'>
                        REVIT 2025 | 2024 | 2023 | 2022 | 2021
                     </p>
                     <p className='font-black uppercase tracking-[0.2em] text-xs'>
                        For Windows
                     </p>
                     <Button asChild variant='outline' className='mt-4 uppercase'>
                        <a href="https://apps.autodesk.com/RVT/en/Detail/Index?id=439862635907036577&appLang=en&os=Win64">
                           <svg viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg" height="88" width="88"><path d="m0 12.402 35.687-4.86.016 34.423-35.67.203zm35.67 33.529.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.739z" fill="currentColor" /></svg>
                           Download
                        </a>
                     </Button>
                     <Sheet>
                        <SheetTrigger asChild>
                           <Button className='flex mb-6 mx-auto text-white mt-4 uppercase'>
                              Installation guide
                           </Button>
                        </SheetTrigger>
                        <SheetContent className='p-4 md:p-8'>
                           <p className='text-xl font-black'>
                              REVIT
                           </p>
                           <iframe className='w-full aspect-video' src="https://www.youtube.com/embed/I_VltNrGvyU?si=rt-neHRhg4g8oWFm" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
                        </SheetContent>
                     </Sheet>
                     <p className='font-black uppercase tracking-[0.2em] text-xs'>
                        Installer provided.
                     </p>
                  </div>
                  <img loading="lazy" decoding="async" width="1024" height="787" src={revit} className='w-full max-w-[600px] mx-auto' alt="" ></img>
               </div>
               <div className='grid lg:grid-cols-2 px-5 my-16 lg:my-28 container mx-auto max-lg:gap-10'>
                  <div className='text-center'>
                     <img className='max-w-32 mx-auto mb-4' src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/2pc6BaE6aMLOO5aR3pCV5N0xvUt.svg" alt="Plugin Logo" />
                     <p className='uppercase font-light text-xs tracking-[0.2em] mb-3'>
                        Supported versions:
                     </p>
                     <p className='font-black tracking-[0.2em] text-xs mb-2'>
                        RHINO 8 | RHINO 7
                     </p>
                     <p className='font-black uppercase tracking-[0.2em] text-xs'>
                        FOR WINDOWS &amp; MAC from food4rhino:
                     </p>
                     <div className='flex justify-center my-4 gap-4 text-3xl'>
                        <svg viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg" className='size-9 mt-1.5'><path d="m0 12.402 35.687-4.86.016 34.423-35.67.203zm35.67 33.529.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.739z" fill="currentColor" /></svg>
                        <svg xmlns="http://www.w3.org/2000/svg" className='size-10' viewBox="0 0 814 1000"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" /></svg>
                     </div>
                     <Button asChild variant={'outline'} className='mt-4 uppercase'>
                        <a href="https://www.food4rhino.com/en/app/typusai" target="_blank">
                           Download
                        </a>
                     </Button>
                     <Sheet>
                        <SheetTrigger asChild>
                           <Button className='flex mb-6 mx-auto text-white mt-4 uppercase'>
                              INSTALLATION GUIDE
                           </Button>
                        </SheetTrigger>
                        <SheetContent className='p-4 md:p-8 overflow-y-auto'>
                           <div className='mb-6'>
                              <p className='text-xl font-black uppercase mb-2'>
                                 RHINO 8
                              </p>
                              <iframe
                                 className='w-full aspect-video'
                                 src="https://www.youtube.com/embed/NfW0UWpxIls"
                                 title="Installation Guide Yanus Connector | RHINO"
                                 frameBorder="0"
                                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                 referrerPolicy="strict-origin-when-cross-origin"
                                 allowFullScreen>
                              </iframe>
                           </div>

                           <div className='mb-6'>
                              <p className='text-xl font-black uppercase mb-2'>
                                 RHINO 7
                              </p>
                              <p className='text-sm mb-4'>
                                 FOR RHINO 7 FOLLOW THE SAME STEPS TO INSTALL. RIGHT CLICK ON THE PANELS TAB TO ACCESS THE PLUGIN
                              </p>
                              <img
                                 width="586"
                                 height="624"
                                 src="https://h38.294.myftpupload.com/wp-content/uploads/2025/03/Screenshot-2025-05-17-181650.png"
                                 className='w-full max-w-sm mx-auto mb-4'
                                 alt="Rhino 7 Panels Tab Screenshot"
                                 srcSet="https://h38.294.myftpupload.com/wp-content/uploads/2025/03/Screenshot-2025-05-17-181650.png 586w, https://h38.294.myftpupload.com/wp-content/uploads/2025/03/Screenshot-2025-05-17-181650-282x300.png 282w"
                                 sizes="(max-width: 586px) 100vw, 586px">
                              </img>
                           </div>

                        </SheetContent>
                     </Sheet>
                     <img loading="lazy" decoding="async" width="292" height="80" src="https://h38.294.myftpupload.com/wp-content/uploads/2025/02/Screenshot-2025-02-17-194056.png" className='max-w-[150px] mx-auto mb-2' alt="Yak Logo" />
                     <p className='font-black uppercase tracking-[0.2em] text-xs text-balance'>
                        no installer required. DRAG &amp; DROP THE DOWNLOADED .YAK FILE INTO THE VIEWPORT OF RHINO.
                     </p>
                  </div>
                  <img loading="lazy" decoding="async" width="1024" height="787" src={rhino} className='w-full max-w-[600px] mx-auto' alt="Mockup" ></img>
               </div>
               <div className='grid lg:grid-cols-2 px-5 my-16 lg:my-28 container mx-auto max-lg:gap-10'>
                  <div className='text-center'>
                     <img className='max-w-48 mx-auto mb-4' src="https://h38.294.myftpupload.com/wp-content/uploads/2025/03/Archicad_Logo-1.png" alt="Archicad Logo" />
                     <p className='uppercase font-light text-xs tracking-[0.2em] mb-3'>
                        Supported versions:
                     </p>
                     <p className='font-black tracking-[0.2em] text-xs mb-2'>
                        AC 28 | AC 27 | AC 26 | AC 25
                     </p>
                     <p className='font-black uppercase tracking-[0.2em] text-xs'>
                        FOR WINDOWS &amp; MAC UNDER MAINTENANCE
                     </p>

                     <div className='flex justify-center my-4 gap-4 text-3xl'>
                        <svg viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg" className='size-9 mt-1.5'><path d="m0 12.402 35.687-4.86.016 34.423-35.67.203zm35.67 33.529.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.739z" fill="currentColor" /></svg>
                        <svg xmlns="http://www.w3.org/2000/svg" className='size-10' viewBox="0 0 814 1000"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" /></svg>
                     </div>
                     <Button variant={'outline'} className='mt-4 uppercase' disabled>
                        AVAILABLE SOON
                        {/* <a href="https://h38.294.myftpupload.com/wp-content/uploads/2025/07/TYPUS.AI_AC25-28.zip" download="Yanusconnector_AC_Windows"></a> */}
                     </Button>

                     <Sheet>
                        <SheetTrigger asChild>
                           <Button className='flex mb-6 mx-auto text-white mt-4 uppercase'>
                              INSTALLATION GUIDE
                           </Button>
                        </SheetTrigger>
                        <SheetContent className='p-4 md:p-8 overflow-y-auto'>
                           <div className='mb-6'>
                              <p className='text-xl font-black uppercase mb-2'>
                                 ARCHICAD
                              </p>
                              <iframe
                                 className='w-full aspect-video'
                                 src="https://www.youtube.com/embed/macPqVW3LAQ"
                                 title="Installation Guide Yanus Connector | ARCHICAD"
                                 frameBorder="0"
                                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                 referrerPolicy="strict-origin-when-cross-origin"
                                 allowFullScreen>
                              </iframe>
                           </div>
                        </SheetContent>
                     </Sheet>

                     <img loading="lazy" decoding="async" width="257" height="59" src="https://h38.294.myftpupload.com/wp-content/uploads/2025/03/Screenshot-2025-03-12-132942.png" className='max-w-[120px] mx-auto mb-2' alt="Installer" />
                     <p className='font-black uppercase tracking-[0.2em] text-xs'>
                        INSTALLER PROVIDED.
                     </p>
                  </div>
                  <img loading="lazy" decoding="async" width="1024" height="787" src={archicad_logo} className='w-full max-w-[600px] mx-auto' alt="Archicad Mockup" sizes="(max-width: 1024px) 100vw, 1024px"></img>
               </div>
               <div className='grid lg:grid-cols-2 px-5 my-16 lg:my-28 container mx-auto max-lg:gap-10'>
                  <div className='text-center'>
                     <img className='max-w-48 mx-auto mb-4' src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/2pc6XI9HHriVl4PYOjQljtZPV52-1.svg" alt="Sketchup Logo" />
                     <p className='uppercase font-light text-xs tracking-[0.2em] mb-3'>
                        Supported versions:
                     </p>
                     <p className='font-black tracking-[0.2em] text-xs mb-2'>
                        SKETCHUP 2025 | 2024 | 2023 | 2022 | 2021
                     </p>
                     <p className='font-black uppercase tracking-[0.2em] text-xs'>
                        FOR WINDOWS &amp; MAC
                     </p>

                     <div className='flex justify-center my-4 gap-4 text-3xl'>
                        <i aria-hidden="true" className="fab fa-windows text-3xl"></i>
                        <i aria-hidden="true" className="fab fa-apple text-3xl"></i>
                     </div>

                     <Button asChild variant={'outline'} className='mt-4 uppercase'>
                        <a href="https://extensions.sketchup.com/extension/65c6e0bd-0d61-42cc-ad3c-fdcf3cb7ede4/typus-ai" target="_blank" rel="noopener noreferrer" download="Yanusconnector_AC_Windows">
                           DOWNLOAD
                        </a>
                     </Button>

                     <Sheet>
                        <SheetTrigger asChild>
                           <Button className='flex mb-6 mx-auto text-white mt-4 uppercase'>
                              INSTALLATION GUIDE
                           </Button>
                        </SheetTrigger>
                        <SheetContent className='p-4 md:p-8 overflow-y-auto'>
                           <div className='mb-6'>
                              <p className='text-xl font-black uppercase mb-2'>
                                 SKETCHUP
                              </p>
                              <iframe
                                 className='w-full aspect-video'
                                 src="https://www.youtube.com/embed/taqktszEv-c?si=e_Y2V08sLA86la8y"
                                 title="Installation Guide Yanus Connector | SKETCHUP"
                                 frameBorder="0"
                                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                 referrerPolicy="strict-origin-when-cross-origin"
                                 allowFullScreen>
                              </iframe>
                           </div>
                        </SheetContent>
                     </Sheet>

                     <p className='font-black uppercase tracking-[0.2em] text-xs'>
                        INSTALLER PROVIDED.
                     </p>
                  </div>

                  <img loading="lazy" decoding="async" width="1024" height="787" className='w-full max-w-[600px] mx-auto' src={sketchup}></img>
               </div>
               <div className='my-16 lg:my-28 container mx-auto text-center'>
                  <h2 className='uppercase tracking-[0.2em] font-light text-xs mb-6'>
                     TO BE RELEASED:
                  </h2>

                  <div className='grid grid-cols-3 gap-4 px-5 max-w-2xl mx-auto'>
                     <div className='flex justify-center items-center'>
                        <img loading="lazy" decoding="async" src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/2pcEqkpNbvHCaRQ5Sce1B6Ry2dV.svg" className='w-full max-w-[120px]' alt="Revit Logo" />
                     </div>
                     <div className='flex justify-center items-center'>
                        <img loading="lazy" decoding="async" src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/2pcEPMv4t2i7zCZerO7lMAXeBN1.svg" className='w-full max-w-[120px]' alt="Vectorworks Logo" />
                     </div>
                     <div className='flex justify-center items-center'>
                        <img loading="lazy" decoding="async" src="https://h38.294.myftpupload.com/wp-content/uploads/2024/12/2pcFLclYXwAKYNjyqo0Vrfit1Nf.svg" className='w-full max-w-[120px]' alt="BricsCAD Logo" />
                     </div>
                  </div>
               </div>
               <div className='py-8 px-4 max-w-4xl mx-auto'>
                  <p className='mb-4'>
                     The **TYPUS** plugins seamlessly integrate BIM software with the **TYPUS** web app, enabling architects to create professional, high-quality visualizations of their designs from within their software. Users can transfer 3D models directly to the TYPUS web app while retaining original texture assignments. Once uploaded, the TYPUS web app automatically generates photorealistic images from the model. Users can refine texture assignments within the web app using an extensive material catalog designed specifically for architectural needs.
                  </p>

                  <h3 className='font-bold text-lg mb-2'>
                     TYPUS: Your SaaS Solution for Architectural Visualization
                  </h3>
                  <p className='mb-3'>
                     TYPUS offers a powerful web-based platform that enhances visualization workflows for architects and designers. The platform's advanced features allow for the efficient creation of stunning, realistic representations of architectural projects. Key features include:
                  </p>

                  <ul className='list-disc list-inside space-y-1 mb-4 pl-4 text-sm'>
                     <li>Photorealistic visualizations</li>
                     <li>Extensive material catalog with customizable options</li>
                     <li>Creative upscaling to high-end resolutions up to 13K</li>
                     <li>Style presets for quick design adaptations</li>
                     <li>Full control over building components for detailed adjustments</li>
                     <li>Style transfer capabilities</li>
                     <li>Custom AI training for tailored visualization outputs</li>
                  </ul>

                  <div className='mb-4 p-3 border-l border-gray-400 bg-gray-50'>
                     <strong className='font-bold'>Important:</strong> To use this plugin, users must subscribe to a plan on the TYPUS platform. Visit{" "}<a href="https://app.typus.ai/signup?m=signup" target="_blank" rel="noopener noreferrer" className='text-blue-600 underline'>app.typus.ai</a> to sign up. After entering your email, a verification email will be sent. Note: our system uses sign-in emails instead of requiring password creation.
                  </div>

                  <h3 className='font-bold text-lg mb-2'>
                     Plugin Buttons and Features
                  </h3>
                  <ul className='list-disc list-inside space-y-1 mb-4 pl-4 text-sm'>
                     <li>
                        <strong className='font-semibold'>Send 3D Model:</strong> Allows users to send a 3D model (including original Revit texture assignments, when used in Revit) to TYPUS directly from the active 3D view in the CAD software.
                     </li>
                     <li>
                        <strong className='font-semibold'>Login:</strong> Sign-in button that opens a web viewer for user authentication. A subscription plan is required to activate the trial period.{" "}
                        <a href="https://app.typus.ai/register" target="_blank" rel="noopener noreferrer" className='text-blue-600 underline'>Sign up here</a>.
                     </li>
                  </ul>
               </div>
            </>
         </div>
      </MainLayout>
   );
};

export default PluginsPage;