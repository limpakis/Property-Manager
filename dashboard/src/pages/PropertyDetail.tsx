import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, DollarSign, Calendar, User, Phone, Mail, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PropertyMap } from '@/components/PropertyMap';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';

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
  Property_Type?: string;
  Owner_Name: string;
  Owner_Email: string;
  Owner_Phone: string;
  Address: string;
  City: string;
  State: string;
  Zip: string;
  Bedrooms: string;
  Bathrooms: string;
  Square_Feet: string;
  Monthly_Rent: string;
  Status: string;
  Lease_Start: string;
  Lease_End: string;
  Tenant_Name: string;
  Tenant_Phone: string;
  Date_Added: string;
  Management_Fee_Percent: string;
  Notes: string;
  Units?: Unit[];
}

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);
        const properties = await api.getProperties();
        const found = properties.find((p: Property) => p.Property_ID === id);
        
        if (found) {
          setProperty(found);
        } else {
          setError('Property not found');
        }
      } catch (error) {
        console.error('Error fetching property:', error);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading property details..." />;
  }

  if (error || !property) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/properties')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </Button>
        <ErrorMessage message={error || 'Property not found'} />
      </div>
    );
  }

  const isMultiUnit = property.Property_Type === 'Multi-Unit' && property.Units && property.Units.length > 0;
  const isOccupied = property.Status === 'Active' || property.Status === 'Occupied';
  
  // Calculate multi-unit statistics
  let totalUnits = 1;
  let occupiedUnits = 0;
  let totalRent = 0;
  
  if (isMultiUnit) {
    totalUnits = property.Units!.length;
    occupiedUnits = property.Units!.filter(u => u.Status === 'Active' || u.Status === 'Occupied').length;
    totalRent = property.Units!.reduce((sum, u) => sum + parseFloat(u.Monthly_Rent || '0'), 0);
  } else {
    occupiedUnits = isOccupied ? 1 : 0;
    totalRent = parseFloat(property.Monthly_Rent || '0');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/properties')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display">{property.Address}</h1>
            {isMultiUnit && (
              <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                <Building2 className="h-3 w-3 mr-1" />
                {totalUnits} Units
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {property.City}, {property.State} {property.Zip}
          </p>
        </div>
        {!isMultiUnit && (
          <Badge variant={isOccupied ? "default" : "secondary"} className="capitalize">
            {property.Status}
          </Badge>
        )}
        {isMultiUnit && (
          <Badge variant="outline">
            {occupiedUnits}/{totalUnits} Occupied
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Property Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isMultiUnit && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="text-lg font-semibold">{property.Bedrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="text-lg font-semibold">{property.Bathrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="text-lg font-semibold">{property.Square_Feet}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="text-lg font-semibold text-primary">
                    ${parseFloat(property.Monthly_Rent).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            
            {isMultiUnit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Units</p>
                    <p className="text-lg font-semibold">{totalUnits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupied</p>
                    <p className="text-lg font-semibold">{occupiedUnits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                    <p className="text-lg font-semibold">{((occupiedUnits/totalUnits)*100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Monthly Rent</p>
                    <p className="text-lg font-semibold text-primary">
                      ${totalRent.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isMultiUnit && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  Lease Period
                </div>
                {property.Lease_Start && property.Lease_End ? (
                  <p className="text-sm">
                    {new Date(property.Lease_Start).toLocaleDateString()} - {new Date(property.Lease_End).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No active lease</p>
                )}
              </div>
            )}

            {property.Notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm">{property.Notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owner Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Owner Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{property.Owner_Name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${property.Owner_Email}`} className="text-sm hover:underline">
                {property.Owner_Email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${property.Owner_Phone}`} className="text-sm hover:underline">
                {property.Owner_Phone}
              </a>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                Management Fee
              </div>
              <p className="text-lg font-semibold">{property.Management_Fee_Percent}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Information Card or Units List */}
        {!isMultiUnit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Tenant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOccupied && property.Tenant_Name ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="text-lg font-semibold">{property.Tenant_Name}</p>
                  </div>
                  {property.Tenant_Phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${property.Tenant_Phone}`} className="text-sm hover:underline">
                        {property.Tenant_Phone}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No tenant currently assigned</p>
                  <p className="text-sm text-muted-foreground mt-2">Property is vacant</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Map Card */}
        <PropertyMap 
          address={property.Address}
          city={property.City}
          state={property.State}
          zip={property.Zip}
        />
      </div>

      {/* Units List for Multi-Unit Properties */}
      {isMultiUnit && property.Units && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Units ({property.Units.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {property.Units.map((unit) => {
                  const unitOccupied = unit.Status === 'Active' || unit.Status === 'Occupied';
                  return (
                    <Card key={unit.Unit_Number} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg">Unit {unit.Unit_Number}</h3>
                          <Badge 
                            variant={unitOccupied ? 'default' : unit.Status === 'Maintenance' ? 'outline' : 'secondary'}
                            className="capitalize"
                          >
                            {unit.Status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bedrooms</span>
                            <span className="font-medium">{unit.Bedrooms}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bathrooms</span>
                            <span className="font-medium">{unit.Bathrooms}</span>
                          </div>
                          {unit.Square_Feet && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Square Feet</span>
                              <span className="font-medium">{unit.Square_Feet}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-muted-foreground">Monthly Rent</span>
                            <span className="font-semibold text-primary">
                              ${parseFloat(unit.Monthly_Rent).toLocaleString()}
                            </span>
                          </div>
                          
                          {unitOccupied && unit.Tenant_Name && (
                            <>
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Tenant</p>
                                <p className="font-medium">{unit.Tenant_Name}</p>
                                {unit.Tenant_Phone && (
                                  <a href={`tel:${unit.Tenant_Phone}`} className="text-xs text-primary hover:underline">
                                    {unit.Tenant_Phone}
                                  </a>
                                )}
                              </div>
                              {unit.Lease_Start && unit.Lease_End && (
                                <div className="pt-2 border-t">
                                  <p className="text-xs text-muted-foreground mb-1">Lease Period</p>
                                  <p className="text-xs">
                                    {new Date(unit.Lease_Start).toLocaleDateString()} -{' '}
                                    {new Date(unit.Lease_End).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
