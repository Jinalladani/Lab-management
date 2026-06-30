// import React, { useState, useEffect } from "react";
// import { MainLayout } from "../components/layout";
// import { getProjects, createProject, updateProject, deleteProject } from "../api/projects";
// import { getClients } from "../api/clients";
// import AddIcon from "@mui/icons-material/Add";
// import EditIcon from "@mui/icons-material/Edit";
// import DeleteIcon from "@mui/icons-material/Delete";
// import SearchIcon from "@mui/icons-material/Search";
// import {
//   Box,
//   Button,
//   Card,
//   CardContent,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   IconButton,
//   Typography,
//   Chip,
//   InputAdornment,
//   Alert,
//   Snackbar,
//   Menu,
//   MenuItem,
//   FormControl,
//   InputLabel,
//   Select,
// } from "@mui/material";

// const Projects = () => {
//   const [projects, setProjects] = useState([]);
//   const [clients, setClients] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [openDialog, setOpenDialog] = useState(false);
//   const [editingProject, setEditingProject] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("");
//   const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
//   const [anchorEl, setAnchorEl] = useState(null);

//   const [formData, setFormData] = useState({
//     project_code: "",
//     project_name: "",
//     project_description: "",
//     client_id: "",
//     location_name: "",
//     site_address: "",
//     city: "",
//     state: "",
//     pincode: "",
//     start_date: "",
//     end_date: "",
//     status: "planning",
//     priority: "medium",
//     budget: "",
//   });

//   useEffect(() => {
//     fetchProjects();
//     fetchClients();
//   }, [searchTerm, statusFilter]);

//   const fetchProjects = async () => {
//     try {
//       setLoading(true);
//       const params = {};
//       if (searchTerm) params.search = searchTerm;
//       if (statusFilter) params.status = statusFilter;
      
//       const response = await getProjects(params);
//       setProjects(response.data.data || []);
//     } catch (error) {
//       showSnackbar("Failed to fetch projects", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchClients = async () => {
//     try {
//       const response = await getClients({ status: "active" });
//       setClients(response.data.data || []);
//     } catch (error) {
//       console.error("Failed to fetch clients:", error);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const submitData = {
//         ...formData,
//         budget: formData.budget ? parseFloat(formData.budget) : null,
//       };

//       if (editingProject) {
//         await updateProject(editingProject.project_id, submitData);
//         showSnackbar("Project updated successfully", "success");
//       } else {
//         await createProject(submitData);
//         showSnackbar("Project created successfully", "success");
//       }
//       setOpenDialog(false);
//       resetForm();
//       fetchProjects();
//     } catch (error) {
//       showSnackbar(error.response?.data?.message || "Operation failed", "error");
//     }
//   };

//   const handleDelete = async (projectId) => {
//     try {
//       await deleteProject(projectId);
//       showSnackbar("Project deleted successfully", "success");
//       fetchProjects();
//     } catch (error) {
//       showSnackbar("Failed to delete project", "error");
//     }
//   };

//   const resetForm = () => {
//     setFormData({
//       project_code: "",
//       project_name: "",
//       project_description: "",
//       client_id: "",
//       location_name: "",
//       site_address: "",
//       city: "",
//       state: "",
//       pincode: "",
//       start_date: "",
//       end_date: "",
//       status: "planning",
//       priority: "medium",
//       budget: "",
//     });
//     setEditingProject(null);
//   };

//   const handleEdit = (project) => {
//     setEditingProject(project);
//     setFormData({
//       project_code: project.project_code,
//       project_name: project.project_name,
//       project_description: project.project_description || "",
//       client_id: project.client_id || "",
//       location_name: project.location_name || "",
//       site_address: project.site_address || "",
//       city: project.city || "",
//       state: project.state || "",
//       pincode: project.pincode || "",
//       start_date: project.start_date || "",
//       end_date: project.end_date || "",
//       status: project.status,
//       priority: project.priority,
//       budget: project.budget || "",
//     });
//     setOpenDialog(true);
//   };

//   const showSnackbar = (message, severity) => {
//     setSnackbar({ open: true, message, severity });
//   };

//   const handleMenuClick = (event) => {
//     setAnchorEl(event.currentTarget);
//   };

//   const handleMenuClose = () => {
//     setAnchorEl(null);
//   };

//   const handleStatusFilter = (status) => {
//     setStatusFilter(status);
//     handleMenuClose();
//   };

//   const getClientName = (clientId) => {
//     const client = clients.find(c => c.client_id === clientId);
//     return client ? client.client_name : "-";
//   };

//   const getPriorityColor = (priority) => {
//     switch (priority) {
//       case "high": return "error";
//       case "medium": return "warning";
//       case "low": return "success";
//       default: return "default";
//     }
//   };

//   const getStatusColor = (status) => {
//     switch (status) {
//       case "completed": return "success";
//       case "in_progress": return "info";
//       case "on_hold": return "warning";
//       case "cancelled": return "error";
//       default: return "default";
//     }
//   };

//   return (
//     <MainLayout headerTitle="Projects" headerSubtitle="Manage your projects">
//       <Box className="p-6">
//         {/* Header Actions */}
//         <Box className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
//           <Box className="flex flex-col sm:flex-row gap-3 flex-1">
//             <TextField
//               placeholder="Search projects..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               size="small"
//               InputProps={{
//                 startAdornment: (
//                   <InputAdornment position="start">
//                     <SearchIcon />
//                   </InputAdornment>
//                 ),
//               }}
//               className="w-full sm:w-80"
//             />
//             <Button
//               variant="outlined"
//               onClick={handleMenuClick}
//               className="whitespace-nowrap"
//             >
//               Status: {statusFilter || "All"}
//             </Button>
//             <Menu
//               anchorEl={anchorEl}
//               open={Boolean(anchorEl)}
//               onClose={handleMenuClose}
//             >
//               <MenuItem onClick={() => handleStatusFilter("")}>All</MenuItem>
//               <MenuItem onClick={() => handleStatusFilter("planning")}>Planning</MenuItem>
//               <MenuItem onClick={() => handleStatusFilter("in_progress")}>In Progress</MenuItem>
//               <MenuItem onClick={() => handleStatusFilter("completed")}>Completed</MenuItem>
//               <MenuItem onClick={() => handleStatusFilter("on_hold")}>On Hold</MenuItem>
//               <MenuItem onClick={() => handleStatusFilter("cancelled")}>Cancelled</MenuItem>
//             </Menu>
//           </Box>
//           <Button
//             variant="contained"
//             startIcon={<AddIcon />}
//             onClick={() => {
//               resetForm();
//               setOpenDialog(true);
//             }}
//             className="bg-[#2562AA] hover:bg-[#1e4d8a]"
//           >
//             Add Project
//           </Button>
//         </Box>

//         {/* Projects Table */}
//         <Card>
//           <CardContent className="p-0">
//             <TableContainer>
//               <Table>
//                 <TableHead>
//                   <TableRow className="bg-gray-50">
//                     <TableCell className="font-semibold">Project Code</TableCell>
//                     <TableCell className="font-semibold">Project Name</TableCell>
//                     <TableCell className="font-semibold">Client</TableCell>
//                     <TableCell className="font-semibold">Location</TableCell>
//                     <TableCell className="font-semibold">Status</TableCell>
//                     <TableCell className="font-semibold">Priority</TableCell>
//                     <TableCell className="font-semibold">Actions</TableCell>
//                   </TableRow>
//                 </TableHead>
//                 <TableBody>
//                   {loading ? (
//                     <TableRow>
//                       <TableCell colSpan={7} className="text-center py-8">
//                         Loading...
//                       </TableCell>
//                     </TableRow>
//                   ) : projects.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={7} className="text-center py-8">
//                         <Typography color="textSecondary">
//                           No projects found
//                         </Typography>
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     projects.map((project) => (
//                       <TableRow key={project.project_id} hover>
//                         <TableCell className="font-medium">{project.project_code}</TableCell>
//                         <TableCell>{project.project_name}</TableCell>
//                         <TableCell>{getClientName(project.client_id)}</TableCell>
//                         <TableCell>{project.location_name || project.city || "-"}</TableCell>
//                         <TableCell>
//                           <Chip
//                             label={project.status.replace("_", " ")}
//                             color={getStatusColor(project.status)}
//                             size="small"
//                           />
//                         </TableCell>
//                         <TableCell>
//                           <Chip
//                             label={project.priority}
//                             color={getPriorityColor(project.priority)}
//                             size="small"
//                           />
//                         </TableCell>
//                         <TableCell>
//                           <IconButton
//                             size="small"
//                             onClick={() => handleEdit(project)}
//                             color="primary"
//                           >
//                             <EditIcon fontSize="small" />
//                           </IconButton>
//                           <IconButton
//                             size="small"
//                             onClick={() => handleDelete(project.project_id)}
//                             color="error"
//                           >
//                             <DeleteIcon fontSize="small" />
//                           </IconButton>
//                         </TableCell>
//                       </TableRow>
//                     ))
//                   )}
//                 </TableBody>
//               </Table>
//             </TableContainer>
//           </CardContent>
//         </Card>

//         {/* Add/Edit Project Dialog */}
//         <Dialog
//           open={openDialog}
//           onClose={() => setOpenDialog(false)}
//           maxWidth="lg"
//           fullWidth
//         >
//           <DialogTitle>
//             {editingProject ? "Edit Project" : "Add New Project"}
//           </DialogTitle>
//           <form onSubmit={handleSubmit}>
//             <DialogContent>
//               <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <TextField
//                   label="Project Code *"
//                   value={formData.project_code}
//                   onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
//                   required
//                   fullWidth
//                 />
//                 <TextField
//                   label="Project Name *"
//                   value={formData.project_name}
//                   onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
//                   required
//                   fullWidth
//                 />
//                 <TextField
//                   label="Client"
//                   select
//                   value={formData.client_id}
//                   onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
//                   fullWidth
//                 >
//                   <MenuItem value="">No Client</MenuItem>
//                   {clients.map((client) => (
//                     <MenuItem key={client.client_id} value={client.client_id}>
//                       {client.client_name}
//                     </MenuItem>
//                   ))}
//                 </TextField>
//                 <TextField
//                   label="Location Name"
//                   value={formData.location_name}
//                   onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="Project Description"
//                   value={formData.project_description}
//                   onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
//                   fullWidth
//                   multiline
//                   rows={3}
//                   className="md:col-span-2"
//                 />
//                 <TextField
//                   label="Site Address"
//                   value={formData.site_address}
//                   onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
//                   fullWidth
//                   className="md:col-span-2"
//                 />
//                 <TextField
//                   label="City"
//                   value={formData.city}
//                   onChange={(e) => setFormData({ ...formData, city: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="State"
//                   value={formData.state}
//                   onChange={(e) => setFormData({ ...formData, state: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="Pincode"
//                   value={formData.pincode}
//                   onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="Budget"
//                   type="number"
//                   value={formData.budget}
//                   onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="Start Date"
//                   type="date"
//                   value={formData.start_date}
//                   onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
//                   fullWidth
//                   InputLabelProps={{ shrink: true }}
//                 />
//                 <TextField
//                   label="End Date"
//                   type="date"
//                   value={formData.end_date}
//                   onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
//                   fullWidth
//                   InputLabelProps={{ shrink: true }}
//                 />
//                 <FormControl fullWidth>
//                   <InputLabel>Status</InputLabel>
//                   <Select
//                     value={formData.status}
//                     onChange={(e) => setFormData({ ...formData, status: e.target.value })}
//                     label="Status"
//                   >
//                     <MenuItem value="planning">Planning</MenuItem>
//                     <MenuItem value="in_progress">In Progress</MenuItem>
//                     <MenuItem value="completed">Completed</MenuItem>
//                     <MenuItem value="on_hold">On Hold</MenuItem>
//                     <MenuItem value="cancelled">Cancelled</MenuItem>
//                   </Select>
//                 </FormControl>
//                 <FormControl fullWidth>
//                   <InputLabel>Priority</InputLabel>
//                   <Select
//                     value={formData.priority}
//                     onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
//                     label="Priority"
//                   >
//                     <MenuItem value="low">Low</MenuItem>
//                     <MenuItem value="medium">Medium</MenuItem>
//                     <MenuItem value="high">High</MenuItem>
//                   </Select>
//                 </FormControl>
//               </Box>
//             </DialogContent>
//             <DialogActions>
//               <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
//               <Button type="submit" variant="contained">
//                 {editingProject ? "Update" : "Create"}
//               </Button>
//             </DialogActions>
//           </form>
//         </Dialog>

//         {/* Snackbar */}
//         <Snackbar
//           open={snackbar.open}
//           autoHideDuration={6000}
//           onClose={() => setSnackbar({ ...snackbar, open: false })}
//         >
//           <Alert
//             onClose={() => setSnackbar({ ...snackbar, open: false })}
//             severity={snackbar.severity}
//             sx={{ width: "100%" }}
//           >
//             {snackbar.message}
//           </Alert>
//         </Snackbar>
//       </Box>
//     </MainLayout>
//   );
// };

// export default Projects;
