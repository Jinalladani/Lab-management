// import React, { useState, useEffect } from "react";
// import { MainLayout } from "../components/layout";
// import { getClients, createClient, updateClient, deleteClient } from "../api/clients";
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
// } from "@mui/material";

// const Clients = () => {
//   const [clients, setClients] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [openDialog, setOpenDialog] = useState(false);
//   const [editingClient, setEditingClient] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("");
//   const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
//   const [anchorEl, setAnchorEl] = useState(null);

//   const [formData, setFormData] = useState({
//     client_name: "",
//     contact_person: "",
//     email: "",
//     phone: "",
//     address: "",
//     city: "",
//     state: "",
//     pincode: "",
//     gst_no: "",
//     status: "active",
//   });

//   useEffect(() => {
//     fetchClients();
//   }, [searchTerm, statusFilter]);

//   const fetchClients = async () => {
//     try {
//       setLoading(true);
//       const params = {};
//       if (searchTerm) params.search = searchTerm;
//       if (statusFilter) params.status = statusFilter;
      
//       const response = await getClients(params);
//       setClients(response.data.data || []);
//     } catch (error) {
//       showSnackbar("Failed to fetch clients", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       if (editingClient) {
//         await updateClient(editingClient.client_id, formData);
//         showSnackbar("Client updated successfully", "success");
//       } else {
//         await createClient(formData);
//         showSnackbar("Client created successfully", "success");
//       }
//       setOpenDialog(false);
//       resetForm();
//       fetchClients();
//     } catch (error) {
//       showSnackbar(error.response?.data?.message || "Operation failed", "error");
//     }
//   };

//   const handleDelete = async (clientId) => {
//     try {
//       await deleteClient(clientId);
//       showSnackbar("Client deleted successfully", "success");
//       fetchClients();
//     } catch (error) {
//       showSnackbar("Failed to delete client", "error");
//     }
//   };

//   const resetForm = () => {
//     setFormData({
//       client_name: "",
//       contact_person: "",
//       email: "",
//       phone: "",
//       address: "",
//       city: "",
//       state: "",
//       pincode: "",
//       gst_no: "",
//       status: "active",
//     });
//     setEditingClient(null);
//   };

//   const handleEdit = (client) => {
//     setEditingClient(client);
//     setFormData({
//       client_name: client.client_name,
//       contact_person: client.contact_person || "",
//       email: client.email || "",
//       phone: client.phone || "",
//       address: client.address || "",
//       city: client.city || "",
//       state: client.state || "",
//       pincode: client.pincode || "",
//       gst_no: client.gst_no || "",
//       status: client.status,
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

//   return (
//     <MainLayout headerTitle="Clients" headerSubtitle="Manage your clients">
//       <Box className="p-6">
//         {/* Header Actions */}
//         <Box className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
//           <Box className="flex flex-col sm:flex-row gap-3 flex-1">
//             <TextField
//               placeholder="Search clients..."
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
//               <MenuItem onClick={() => handleStatusFilter("active")}>Active</MenuItem>
//               <MenuItem onClick={() => handleStatusFilter("inactive")}>Inactive</MenuItem>
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
//             Add Client
//           </Button>
//         </Box>

//         {/* Clients Table */}
//         <Card>
//           <CardContent className="p-0">
//             <TableContainer>
//               <Table>
//                 <TableHead>
//                   <TableRow className="bg-gray-50">
//                     <TableCell className="font-semibold">Client Name</TableCell>
//                     <TableCell className="font-semibold">Contact Person</TableCell>
//                     <TableCell className="font-semibold">Email</TableCell>
//                     <TableCell className="font-semibold">Phone</TableCell>
//                     <TableCell className="font-semibold">City</TableCell>
//                     <TableCell className="font-semibold">Status</TableCell>
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
//                   ) : clients.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={7} className="text-center py-8">
//                         <Typography color="textSecondary">
//                           No clients found
//                         </Typography>
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     clients.map((client) => (
//                       <TableRow key={client.client_id} hover>
//                         <TableCell className="font-medium">{client.client_name}</TableCell>
//                         <TableCell>{client.contact_person || "-"}</TableCell>
//                         <TableCell>{client.email || "-"}</TableCell>
//                         <TableCell>{client.phone || "-"}</TableCell>
//                         <TableCell>{client.city || "-"}</TableCell>
//                         <TableCell>
//                           <Chip
//                             label={client.status}
//                             color={client.status === "active" ? "success" : "default"}
//                             size="small"
//                           />
//                         </TableCell>
//                         <TableCell>
//                           <IconButton
//                             size="small"
//                             onClick={() => handleEdit(client)}
//                             color="primary"
//                           >
//                             <EditIcon fontSize="small" />
//                           </IconButton>
//                           <IconButton
//                             size="small"
//                             onClick={() => handleDelete(client.client_id)}
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

//         {/* Add/Edit Client Dialog */}
//         <Dialog
//           open={openDialog}
//           onClose={() => setOpenDialog(false)}
//           maxWidth="md"
//           fullWidth
//         >
//           <DialogTitle>
//             {editingClient ? "Edit Client" : "Add New Client"}
//           </DialogTitle>
//           <form onSubmit={handleSubmit}>
//             <DialogContent>
//               <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <TextField
//                   label="Client Name *"
//                   value={formData.client_name}
//                   onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
//                   required
//                   fullWidth
//                 />
//                 <TextField
//                   label="Contact Person"
//                   value={formData.contact_person}
//                   onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="Email"
//                   type="email"
//                   value={formData.email}
//                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="Phone"
//                   value={formData.phone}
//                   onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="Address"
//                   value={formData.address}
//                   onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
//                   label="GST Number"
//                   value={formData.gst_no}
//                   onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
//                   fullWidth
//                 />
//                 <TextField
//                   label="Status"
//                   select
//                   value={formData.status}
//                   onChange={(e) => setFormData({ ...formData, status: e.target.value })}
//                   fullWidth
//                   SelectProps={{ native: true }}
//                 >
//                   <option value="active">Active</option>
//                   <option value="inactive">Inactive</option>
//                 </TextField>
//               </Box>
//             </DialogContent>
//             <DialogActions>
//               <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
//               <Button type="submit" variant="contained">
//                 {editingClient ? "Update" : "Create"}
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

// export default Clients;
