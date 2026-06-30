// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { createSampleEntry, getUsers } from '../../api/sampleMaster';
// import { getProjectById } from '../../api/projects';
// import { MainLayout } from '../../components/layout';
// import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// import SaveIcon from '@mui/icons-material/Save';
// import DeleteIcon from '@mui/icons-material/Delete';
// import ImageIcon from '@mui/icons-material/Image';

// const initialFormData = {
//   project_id: '',
//   project_no: '',
//   letter_date: new Date().toISOString().split('T')[0],
//   received_date: new Date().toISOString().split('T')[0],
//   client_name: '',
//   received_by: '',
//   material_name: '',
//   nos: '',
//   test_performed_by: 'Testing Team',
//   testing_start_date: '',
//   testing_completed_date: '',
//   remarks: ''
// };

// const SampleEntry = () => {
//   const navigate = useNavigate();
//   const urlParams = new URLSearchParams(window.location.search);
//   const urlProjectId = urlParams.get('project_id');

//   const [loading, setLoading] = useState(false);
//   const [users, setUsers] = useState([]);
//   const [images, setImages] = useState([]);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [formData, setFormData] = useState({
//     ...initialFormData,
//     project_id: urlProjectId || ''
//   });

//   useEffect(() => {
//     fetchUsers();
//     if (urlProjectId) {
//       loadProjectDetails(urlProjectId);
//     }
//   }, [urlProjectId]);

//   const fetchUsers = async () => {
//     try {
//       const response = await getUsers();
//       setUsers(response.data?.data?.users || response.data?.users || []);
//     } catch (error) {
//       console.error('Error fetching users:', error);
//     }
//   };

//   const loadProjectDetails = async (projectId) => {
//     try {
//       const response = await getProjectById(projectId);
//       const project = response.data?.data || response.data;
//       if (project) {
//         setFormData(prev => ({
//           ...prev,
//           project_id: projectId,
//           project_no: project.project_code || prev.project_no,
//           client_name: project.client_name || prev.client_name
//         }));
//       }
//     } catch (error) {
//       console.error('Error fetching project details:', error);
//     }
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//     if (errorMessage) setErrorMessage('');
//   };

//   const handleImageChange = (e) => {
//     const files = Array.from(e.target.files || []);
//     if (!files.length) return;

//     const newImages = files.map(file => ({
//       id: `${file.name}-${file.lastModified}`,
//       file,
//       preview: URL.createObjectURL(file)
//     }));

//     setImages(prev => [...prev, ...newImages]);
//     e.target.value = '';
//   };

//   const removeImage = (imageId) => {
//     setImages(prev => {
//       const image = prev.find(item => item.id === imageId);
//       if (image?.preview) URL.revokeObjectURL(image.preview);
//       return prev.filter(item => item.id !== imageId);
//     });
//   };

//   const validateForm = () => {
//     const required = [
//       ['project_no', 'Project No'],
//       ['letter_date', 'Letter Date'],
//       ['received_date', 'Received Date'],
//       ['client_name', 'Client Name'],
//       ['received_by', 'Received By'],
//       ['material_name', 'Material Name'],
//       ['nos', 'NOS']
//     ];

//     const missing = required.filter(([field]) => !formData[field]);
//     if (missing.length) {
//       setErrorMessage(`Please fill in: ${missing.map(([, label]) => label).join(', ')}`);
//       return false;
//     }

//     if (Number(formData.nos) <= 0) {
//       setErrorMessage('NOS must be greater than 0');
//       return false;
//     }

//     return true;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     try {
//       setLoading(true);
//       setErrorMessage('');

//       const payload = new FormData();
//       Object.entries(formData).forEach(([key, value]) => {
//         if (value !== null && value !== undefined) {
//           payload.append(key, value);
//         }
//       });

//       images.forEach(({ file }) => {
//         payload.append('images', file);
//       });

//       await createSampleEntry(payload);
//       alert('Sample entry created successfully!');

//       if (formData.project_id) {
//         navigate(`/samples?project_id=${formData.project_id}`);
//       } else {
//         navigate('/samples');
//       }
//     } catch (error) {
//       setErrorMessage(error?.response?.data?.message || 'Failed to save sample entry');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <MainLayout headerTitle="Add Sample Entry" headerSubtitle="Create a new sample register entry">
//       <div className="p-6">
//         <button
//           onClick={() => {
//             if (formData.project_id) {
//               navigate(`/samples?project_id=${formData.project_id}`);
//             } else {
//               navigate('/samples');
//             }
//           }}
//           className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
//         >
//           <ArrowBackIcon fontSize="small" />
//           Back
//         </button>

//         <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
//           <div className="p-8">
//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div className="bg-gray-50 rounded-lg p-6">
//                 <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
//                   <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
//                   Sample Register Details
//                 </h2>

//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Project No. *</label>
//                     <input
//                       type="text"
//                       name="project_no"
//                       value={formData.project_no}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                       placeholder="e.g. GET/1805/1569"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Letter Date *</label>
//                     <input
//                       type="date"
//                       name="letter_date"
//                       value={formData.letter_date}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Received Date *</label>
//                     <input
//                       type="date"
//                       name="received_date"
//                       value={formData.received_date}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Client Name *</label>
//                     <input
//                       type="text"
//                       name="client_name"
//                       value={formData.client_name}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                       placeholder="Client / company name"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Received By *</label>
//                     <select
//                       name="received_by"
//                       value={formData.received_by}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                       required
//                     >
//                       <option value="">Select receiver</option>
//                       {users.map(user => (
//                         <option key={user.user_id} value={`${user.first_name} ${user.last_name}`}>
//                           {user.first_name} {user.last_name}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Material Name *</label>
//                     <input
//                       type="text"
//                       name="material_name"
//                       value={formData.material_name}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                       placeholder="e.g. C.C. Cube, Paver blocks"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">NOS. *</label>
//                     <input
//                       type="number"
//                       name="nos"
//                       value={formData.nos}
//                       onChange={handleInputChange}
//                       min="1"
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                       placeholder="Number of samples"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Test Performed By</label>
//                     <input
//                       type="text"
//                       name="test_performed_by"
//                       value={formData.test_performed_by}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                     />
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Testing Start Date</label>
//                     <input
//                       type="date"
//                       name="testing_start_date"
//                       value={formData.testing_start_date}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                     />
//                   </div>

//                   <div>
//                     <label className="block mb-2 text-sm font-medium text-gray-700">Testing Completed Date</label>
//                     <input
//                       type="date"
//                       name="testing_completed_date"
//                       value={formData.testing_completed_date}
//                       onChange={handleInputChange}
//                       className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae]"
//                     />
//                   </div>
//                 </div>
//               </div>

//               <div className="bg-gray-50 rounded-lg p-6">
//                 <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
//                   <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
//                   Remarks
//                 </h2>
//                 <textarea
//                   name="remarks"
//                   value={formData.remarks}
//                   onChange={handleInputChange}
//                   rows="4"
//                   className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] min-h-[120px]"
//                   placeholder="Additional notes..."
//                 />
//               </div>

//               <div className="bg-gray-50 rounded-lg p-6">
//                 <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
//                   <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
//                   Sample Images
//                 </h2>

//                 <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#2b63ae] transition-colors bg-white">
//                   <ImageIcon className="text-gray-400 mb-2" />
//                   <span className="text-sm text-gray-600">Click to upload one or more images</span>
//                   <input
//                     type="file"
//                     accept="image/*"
//                     multiple
//                     onChange={handleImageChange}
//                     className="hidden"
//                   />
//                 </label>

//                 {images.length > 0 && (
//                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
//                     {images.map(image => (
//                       <div key={image.id} className="relative rounded-lg overflow-hidden border border-gray-200">
//                         <img src={image.preview} alt="Sample" className="w-full h-28 object-cover" />
//                         <button
//                           type="button"
//                           onClick={() => removeImage(image.id)}
//                           className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
//                         >
//                           <DeleteIcon fontSize="small" />
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {errorMessage && (
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
//                   <p className="text-red-600">{errorMessage}</p>
//                 </div>
//               )}

//               <div className="flex justify-end gap-4">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     if (formData.project_id) {
//                       navigate(`/samples?project_id=${formData.project_id}`);
//                     } else {
//                       navigate('/samples');
//                     }
//                   }}
//                   className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#2b63ae] to-[#1e4a8c] text-white font-medium hover:from-[#1e4a8c] hover:to-[#2b63ae] transition-all disabled:opacity-70 shadow-lg flex items-center gap-2"
//                 >
//                   <SaveIcon fontSize="small" />
//                   {loading ? 'Saving...' : 'Create Entry'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </MainLayout>
//   );
// };

// export default SampleEntry;
