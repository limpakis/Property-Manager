import { Building2, MapPin, Home, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { EmptyState } from '@/components/EmptyState';
import { toast } from '@/components/ui/sonner';
import {
  useProperties,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
} from '@/hooks/usePropertyQueries';

interface Unit {
  Unit_Number: string;
  Bedrooms: string;
  Bathrooms: string;
  Square_Feet?: string;
  Monthly_Rent: string;
  Status: string;
  Tenant_Name?: string;
  Tenant_Phone?: string;
  Lease_Start?: string;
  Lease_End?: string;
}

interface Property {
  Property_ID: string;
  Property_Type?: string; // 'Single Unit' or 'Multi-Unit'
  Address: string;
  City: string;
  State: string;
  Zip?: string;
  Bedrooms: string;
  Bathrooms: string;
  Square_Feet?: string;
  Monthly_Rent: string;
  Status: string;
  Tenant_Name?: string;
  Tenant_Phone?: string;
  Owner_Name?: string;
  Owner_Email?: string;
  Owner_Phone?: string;
  Lease_Start?: string;
  Lease_End?: string;
  Management_Fee_Percent?: string;
  Notes?: string;
  Units?: Unit[];
}

const typeIcons: Record<string, string> = {
  apartment: '🏢',
  house: '🏠',
  commercial: '🏪',
  condo: '🏬',
};

const Properties = () => {
  const navigate = useNavigate();

  // ─── Server state via React Query ─────────────────────────────────────────
  const { data: properties = [], isLoading: loading, error: queryError } = useProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  const error = queryError
    ? 'Failed to load properties. Please ensure the backend server is running.'
    : null;

  // ─── Local UI state ───────────────────────────────────────────────────────
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    Property_Type: 'Single Unit',
    Address: '',
    City: '',
    State: '',
    Zip: '',
    Bedrooms: '',
    Bathrooms: '',
    Square_Feet: '',
    Monthly_Rent: '',
    Status: 'Vacant',
    Tenant_Name: '',
    Tenant_Phone: '',
    Owner_Name: '',
    Owner_Email: '',
    Owner_Phone: '',
    Lease_Start: '',
    Lease_End: '',
    Management_Fee_Percent: '',
    Notes: '',
  });
  const [units, setUnits] = useState<Unit[]>([]);

  const openAddDialog = () => {
    setEditingProperty(null);
    setFormData({
      Property_Type: 'Single Unit',
      Address: '',
      City: '',
      State: '',
      Zip: '',
      Bedrooms: '',
      Bathrooms: '',
      Square_Feet: '',
      Monthly_Rent: '',
      Status: 'Vacant',
      Tenant_Name: '',
      Tenant_Phone: '',
      Owner_Name: '',
      Owner_Email: '',
      Owner_Phone: '',
      Lease_Start: '',
      Lease_End: '',
      Management_Fee_Percent: '',
      Notes: '',
    });
    setUnits([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProperty(property);
    setFormData({
      Property_Type: property.Property_Type || 'Single Unit',
      Address: property.Address || '',
      City: property.City || '',
      State: property.State || '',
      Zip: property.Zip || '',
      Bedrooms: property.Bedrooms || '',
      Bathrooms: property.Bathrooms || '',
      Square_Feet: property.Square_Feet || '',
      Monthly_Rent: property.Monthly_Rent || '',
      Status: property.Status || 'Vacant',
      Tenant_Name: property.Tenant_Name || '',
      Tenant_Phone: property.Tenant_Phone || '',
      Owner_Name: property.Owner_Name || '',
      Owner_Email: property.Owner_Email || '',
      Owner_Phone: property.Owner_Phone || '',
      Lease_Start: property.Lease_Start || '',
      Lease_End: property.Lease_End || '',
      Management_Fee_Percent: property.Management_Fee_Percent || '',
      Notes: property.Notes || '',
    });
    setUnits(property.Units || []);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPropertyToDelete(propertyId);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const propertyData = formData.Property_Type === 'Multi-Unit'
      ? { ...formData, Units: units }
      : formData;

    try {
      if (editingProperty) {
        await updateProperty.mutateAsync({ id: editingProperty.Property_ID, data: propertyData });
        toast.success('Property updated successfully');
      } else {
        await createProperty.mutateAsync(propertyData);
        toast.success('Property created successfully');
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error(editingProperty ? 'Failed to update property' : 'Failed to create property');
    }
  };

  const handleDelete = async () => {
    if (!propertyToDelete) return;
    try {
      await deleteProperty.mutateAsync(propertyToDelete);
      toast.success('Property deleted successfully');
      setIsDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addUnit = () => {
    setUnits([...units, {
      Unit_Number: '',
      Bedrooms: '',
      Bathrooms: '',
      Square_Feet: '',
      Monthly_Rent: '',
      Status: 'Vacant',
      Tenant_Name: '',
      Tenant_Phone: '',
      Lease_Start: '',
      Lease_End: '',
    }]);
  };

  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, field: keyof Unit, value: string) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading properties..." />;
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Properties</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your rental properties</p>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Properties</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your rental properties</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {properties.length} properties
          </Badge>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {properties.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Building2}
              title="No Properties Found"
              description="You don't have any properties yet. Add your first property to get started."
            />
          </div>
        ) : properties.map((property) => {
          const isMultiUnit = property.Property_Type === 'Multi-Unit' && property.Units && property.Units.length > 0;
          const isExpanded = expandedProperties.has(property.Property_ID);
          
          let totalUnits = 1;
          let occupiedUnits = 0;
          let totalRent = 0;
          let vacantUnits = 0;
          let maintenanceUnits = 0;
          let displayIcon = typeIcons['house'];
          
          if (isMultiUnit) {
            totalUnits = property.Units!.length;
            occupiedUnits = property.Units!.filter(u => u.Status === 'Active' || u.Status === 'Occupied').length;
            vacantUnits = property.Units!.filter(u => u.Status === 'Vacant').length;
            maintenanceUnits = property.Units!.filter(u => u.Status === 'Maintenance').length;
            totalRent = property.Units!.reduce((sum, u) => sum + parseFloat(u.Monthly_Rent || '0'), 0);
            displayIcon = typeIcons['apartment'];
          } else {
            const isOccupied = property.Status === 'Active' || property.Status === 'Occupied';
            occupiedUnits = isOccupied ? 1 : 0;
            vacantUnits = isOccupied ? 0 : 1;
            totalRent = parseFloat(property.Monthly_Rent || '0');
          }
          
          const occupancy = (occupiedUnits / totalUnits) * 100;
          
          return (
            <Card 
              key={property.Property_ID} 
              className={`shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group ${
                isMultiUnit ? 'border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => navigate(`/properties/${property.Property_ID}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{displayIcon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold font-display group-hover:text-primary transition-colors">
                          {property.Address}
                        </h3>
                        {isMultiUnit && (
                          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            {totalUnits} Units
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {property.City}, {property.State}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => openEditDialog(property, e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={(e) => openDeleteDialog(property.Property_ID, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Occupancy Rate</span>
                    <span className="font-medium">{occupiedUnits}/{totalUnits} {totalUnits === 1 ? 'unit' : 'units'} ({occupancy.toFixed(0)}%)</span>
                  </div>
                  <Progress value={occupancy} className="h-2" />

                  {isMultiUnit && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-green-50 rounded-md">
                        <div className="font-semibold text-green-700">{occupiedUnits}</div>
                        <div className="text-green-600">Occupied</div>
                      </div>
                      <div className="text-center p-2 bg-amber-50 rounded-md">
                        <div className="font-semibold text-amber-700">{vacantUnits}</div>
                        <div className="text-amber-600">Vacant</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <div className="font-semibold text-gray-700">{maintenanceUnits}</div>
                        <div className="text-gray-600">Maintenance</div>
                      </div>
                    </div>
                  )}

                  {!isMultiUnit && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tenant</span>
                        <span className="font-medium text-xs">{property.Tenant_Name || 'Vacant'}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Bedrooms</span>
                        <span className="font-medium">{property.Bedrooms} bed / {property.Bathrooms} bath</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">{isMultiUnit ? 'Total Monthly Rent' : 'Monthly Rent'}</span>
                    <span className="text-lg font-bold text-primary">${totalRent.toLocaleString()}</span>
                  </div>

                  {isMultiUnit && (
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => {
                        setExpandedProperties(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(property.Property_ID)) {
                            newSet.delete(property.Property_ID);
                          } else {
                            newSet.add(property.Property_ID);
                          }
                          return newSet;
                        });
                      }}
                      className="w-full"
                    >
                      <CollapsibleTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors"
                      >
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          View All Units
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {property.Units?.map((unit) => (
                            <div
                              key={unit.Unit_Number}
                              className="p-3 bg-secondary/30 rounded-md text-sm border border-border/50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">Unit {unit.Unit_Number}</span>
                                <Badge
                                  variant={unit.Status === 'Occupied' || unit.Status === 'Active' ? 'default' : unit.Status === 'Vacant' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {unit.Status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div>{unit.Bedrooms} bed / {unit.Bathrooms} bath</div>
                                <div className="text-right font-semibold text-foreground">${parseFloat(unit.Monthly_Rent).toLocaleString()}/mo</div>
                              </div>
                              {unit.Tenant_Name && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  Tenant: {unit.Tenant_Name}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {!isMultiUnit && (
                    <Badge variant={occupiedUnits > 0 ? "default" : "secondary"} className="capitalize">
                      <Home className="h-3 w-3 mr-1" />
                      {property.Status}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Property Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
            <DialogDescription>
              {editingProperty ? 'Update the property details below.' : 'Fill in the details for the new property.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Property Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="property_type">Property Type *</Label>
                <Select 
                  value={formData.Property_Type} 
                  onValueChange={(value) => {
                    handleInputChange('Property_Type', value);
                    if (value === 'Single Unit') {
                      setUnits([]);
                    }
                  }}
                >
                  <SelectTrigger id="property_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Unit">Single Unit</SelectItem>
                    <SelectItem value="Multi-Unit">Multi-Unit Building</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Address Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.Address}
                    onChange={(e) => handleInputChange('Address', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.City}
                    onChange={(e) => handleInputChange('City', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.State}
                    onChange={(e) => handleInputChange('State', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">Zip Code</Label>
                  <Input
                    id="zip"
                    value={formData.Zip}
                    onChange={(e) => handleInputChange('Zip', e.target.value)}
                  />
                </div>
              </div>

              {/* Property Details - Only for Single Unit */}
              {formData.Property_Type === 'Single Unit' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Bedrooms *</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={formData.Bedrooms}
                        onChange={(e) => handleInputChange('Bedrooms', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Bathrooms *</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        step="0.5"
                        value={formData.Bathrooms}
                        onChange={(e) => handleInputChange('Bathrooms', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="square_feet">Square Feet</Label>
                      <Input
                        id="square_feet"
                        type="number"
                        value={formData.Square_Feet}
                        onChange={(e) => handleInputChange('Square_Feet', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_rent">Monthly Rent *</Label>
                      <Input
                        id="monthly_rent"
                        type="number"
                        step="0.01"
                        value={formData.Monthly_Rent}
                        onChange={(e) => handleInputChange('Monthly_Rent', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status *</Label>
                      <Select value={formData.Status} onValueChange={(value) => handleInputChange('Status', value)}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Vacant">Vacant</SelectItem>
                          <SelectItem value="Occupied">Occupied</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Owner Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input
                    id="owner_name"
                    value={formData.Owner_Name}
                    onChange={(e) => handleInputChange('Owner_Name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_email">Owner Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={formData.Owner_Email}
                    onChange={(e) => handleInputChange('Owner_Email', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_phone">Owner Phone</Label>
                <Input
                  id="owner_phone"
                  value={formData.Owner_Phone}
                  onChange={(e) => handleInputChange('Owner_Phone', e.target.value)}
                />
              </div>

              {/* Tenant Information - Only for Single Unit */}
              {formData.Property_Type === 'Single Unit' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenant_name">Tenant Name</Label>
                      <Input
                        id="tenant_name"
                        value={formData.Tenant_Name}
                        onChange={(e) => handleInputChange('Tenant_Name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tenant_phone">Tenant Phone</Label>
                      <Input
                        id="tenant_phone"
                        value={formData.Tenant_Phone}
                        onChange={(e) => handleInputChange('Tenant_Phone', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Lease Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lease_start">Lease Start</Label>
                      <Input
                        id="lease_start"
                        type="date"
                        value={formData.Lease_Start}
                        onChange={(e) => handleInputChange('Lease_Start', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lease_end">Lease End</Label>
                      <Input
                        id="lease_end"
                        type="date"
                        value={formData.Lease_End}
                        onChange={(e) => handleInputChange('Lease_End', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Multi-Unit Management */}
              {formData.Property_Type === 'Multi-Unit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Units / Apartments</Label>
                    <Button type="button" size="sm" onClick={addUnit}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Unit
                    </Button>
                  </div>
                  
                  {units.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-md">
                      No units added yet. Click "Add Unit" to add apartments to this building.
                    </div>
                  )}

                  {units.map((unit, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium">Unit {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeUnit(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Unit Number *</Label>
                            <Input
                              value={unit.Unit_Number}
                              onChange={(e) => updateUnit(index, 'Unit_Number', e.target.value)}
                              placeholder="e.g., 101, A, 1-A"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Status *</Label>
                            <Select 
                              value={unit.Status} 
                              onValueChange={(value) => updateUnit(index, 'Status', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Vacant">Vacant</SelectItem>
                                <SelectItem value="Occupied">Occupied</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Bedrooms *</Label>
                            <Input
                              type="number"
                              value={unit.Bedrooms}
                              onChange={(e) => updateUnit(index, 'Bedrooms', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Bathrooms *</Label>
                            <Input
                              type="number"
                              step="0.5"
                              value={unit.Bathrooms}
                              onChange={(e) => updateUnit(index, 'Bathrooms', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sq Ft</Label>
                            <Input
                              type="number"
                              value={unit.Square_Feet}
                              onChange={(e) => updateUnit(index, 'Square_Feet', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Monthly Rent *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={unit.Monthly_Rent}
                            onChange={(e) => updateUnit(index, 'Monthly_Rent', e.target.value)}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Tenant Name</Label>
                            <Input
                              value={unit.Tenant_Name}
                              onChange={(e) => updateUnit(index, 'Tenant_Name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Tenant Phone</Label>
                            <Input
                              value={unit.Tenant_Phone}
                              onChange={(e) => updateUnit(index, 'Tenant_Phone', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Lease Start</Label>
                            <Input
                              type="date"
                              value={unit.Lease_Start}
                              onChange={(e) => updateUnit(index, 'Lease_Start', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Lease End</Label>
                            <Input
                              type="date"
                              value={unit.Lease_End}
                              onChange={(e) => updateUnit(index, 'Lease_End', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="management_fee">Management Fee (%)</Label>
                <Input
                  id="management_fee"
                  type="number"
                  step="0.1"
                  value={formData.Management_Fee_Percent}
                  onChange={(e) => handleInputChange('Management_Fee_Percent', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.Notes}
                  onChange={(e) => handleInputChange('Notes', e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={createProperty.isPending || updateProperty.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProperty.isPending || updateProperty.isPending}>
                {createProperty.isPending || updateProperty.isPending ? 'Saving...' : editingProperty ? 'Update Property' : 'Create Property'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the property and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Properties;
