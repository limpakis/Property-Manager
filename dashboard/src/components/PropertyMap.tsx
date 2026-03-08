import { useEffect, useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PropertyMapProps {
  address: string;
  city: string;
  state: string;
  zip: string;
}

export const PropertyMap = ({ address, city, state, zip }: PropertyMapProps) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fullAddress = `${address}, ${city}, ${state} ${zip}`;

  useEffect(() => {
    const geocodeAddress = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          setCoordinates({
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon)
          });
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [fullAddress]);

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openInGoogleMaps}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Maps
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{fullAddress}</p>
          
          {loading ? (
            <div className="w-full h-[300px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          ) : coordinates ? (
            <iframe
              width="100%"
              height="300"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.lon - 0.01},${coordinates.lat - 0.01},${coordinates.lon + 0.01},${coordinates.lat + 0.01}&layer=mapnik&marker=${coordinates.lat},${coordinates.lon}`}
              className="rounded-lg border"
            />
          ) : (
            <div className="w-full h-[300px] bg-muted rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Unable to load map for this address</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
