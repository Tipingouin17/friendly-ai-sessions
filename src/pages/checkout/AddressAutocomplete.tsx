import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle, MapPin, Loader2, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
interface AddressAutocompleteProps {
  onAddressSelect: (address: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }) => void;
  value: string;
}
interface AddressSuggestion {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}
interface PlaceDetails {
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address: string;
}
export const AddressAutocomplete = ({
  onAddressSelect,
  value
}: AddressAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [shouldShowManualEntry, setShouldShowManualEntry] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mock function to simulate API call for address suggestions
  const fetchAddressSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
    // In a real implementation, this would call a geocoding API like Google Places API
    console.log("Fetching suggestions for:", query);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!query || query.length < 3) return [];

    // Mock data based on input
    if (query.toLowerCase().includes('new york')) {
      return [{
        description: "New York, NY, USA",
        place_id: "place_id_1",
        structured_formatting: {
          main_text: "New York",
          secondary_text: "NY, USA"
        }
      }, {
        description: "New York Avenue, Washington DC, USA",
        place_id: "place_id_2",
        structured_formatting: {
          main_text: "New York Avenue",
          secondary_text: "Washington DC, USA"
        }
      }];
    }
    if (query.toLowerCase().includes('san fran')) {
      return [{
        description: "San Francisco, CA, USA",
        place_id: "place_id_3",
        structured_formatting: {
          main_text: "San Francisco",
          secondary_text: "CA, USA"
        }
      }];
    }
    if (query.toLowerCase().includes('london')) {
      return [{
        description: "London, UK",
        place_id: "place_id_4",
        structured_formatting: {
          main_text: "London",
          secondary_text: "UK"
        }
      }];
    }

    // Return empty array for no results
    return [];
  };

  // Mock function to get address details from place ID
  const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    // In a real implementation, this would call a geocoding API
    console.log("Fetching details for place ID:", placeId);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 700));

    // Mock responses based on place ID
    switch (placeId) {
      case "place_id_1":
        return {
          formatted_address: "New York, NY, USA",
          address_components: [{
            long_name: "New York",
            short_name: "NY",
            types: ["locality"]
          }, {
            long_name: "New York",
            short_name: "NY",
            types: ["administrative_area_level_1"]
          }, {
            long_name: "10001",
            short_name: "10001",
            types: ["postal_code"]
          }, {
            long_name: "United States",
            short_name: "US",
            types: ["country"]
          }]
        };
      case "place_id_2":
        return {
          formatted_address: "New York Avenue, Washington DC, USA",
          address_components: [{
            long_name: "New York Avenue",
            short_name: "New York Ave",
            types: ["route"]
          }, {
            long_name: "Washington",
            short_name: "DC",
            types: ["locality"]
          }, {
            long_name: "District of Columbia",
            short_name: "DC",
            types: ["administrative_area_level_1"]
          }, {
            long_name: "20001",
            short_name: "20001",
            types: ["postal_code"]
          }, {
            long_name: "United States",
            short_name: "US",
            types: ["country"]
          }]
        };
      case "place_id_3":
        return {
          formatted_address: "San Francisco, CA, USA",
          address_components: [{
            long_name: "San Francisco",
            short_name: "SF",
            types: ["locality"]
          }, {
            long_name: "California",
            short_name: "CA",
            types: ["administrative_area_level_1"]
          }, {
            long_name: "94103",
            short_name: "94103",
            types: ["postal_code"]
          }, {
            long_name: "United States",
            short_name: "US",
            types: ["country"]
          }]
        };
      case "place_id_4":
        return {
          formatted_address: "London, UK",
          address_components: [{
            long_name: "London",
            short_name: "London",
            types: ["locality"]
          }, {
            long_name: "Greater London",
            short_name: "Greater London",
            types: ["administrative_area_level_1"]
          }, {
            long_name: "SW1A 1AA",
            short_name: "SW1A 1AA",
            types: ["postal_code"]
          }, {
            long_name: "United Kingdom",
            short_name: "GB",
            types: ["country"]
          }]
        };
      default:
        return null;
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setError(null);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounce
    timeoutRef.current = setTimeout(async () => {
      if (value.length >= 3) {
        setIsLoading(true);
        try {
          const results = await fetchAddressSuggestions(value);
          setSuggestions(results);
          setOpen(results.length > 0);
        } catch (err) {
          console.error("Error fetching address suggestions:", err);
          setError("Failed to fetch address suggestions. Please try again.");
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
  };

  // Handle address selection
  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    setIsLoading(true);
    setOpen(false);
    try {
      const placeDetails = await fetchPlaceDetails(suggestion.place_id);
      if (placeDetails) {
        // Parse the address components to construct the address
        let addressLine1 = '';
        let city = '';
        let state = '';
        let postalCode = '';
        let country = '';

        // Extract relevant fields from address components
        placeDetails.address_components.forEach(component => {
          const types = component.types;
          if (types.includes('route')) {
            addressLine1 = component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          }
          if (types.includes('postal_code')) {
            postalCode = component.long_name;
          }
          if (types.includes('country')) {
            country = component.long_name;
          }
        });

        // If we don't have a specific street address, use the formatted address as line1
        if (!addressLine1) {
          addressLine1 = placeDetails.formatted_address;
        }

        // Update the parent component with the parsed address
        onAddressSelect({
          line1: addressLine1,
          city,
          state,
          postal_code: postalCode,
          country
        });

        // Update the input value
        setInputValue(placeDetails.formatted_address);
      }
    } catch (err) {
      console.error("Error fetching place details:", err);
      setError("Failed to get address details. Please try again or enter your address manually.");
    } finally {
      setIsLoading(false);
    }
  };

  // Enable manual entry
  const handleManualEntry = () => {
    setShouldShowManualEntry(true);
    setOpen(false);
  };
  return <div className="space-y-2 w-full">
      <Label htmlFor="address-autocomplete" className="text-left block">
        Address <span className="text-destructive">*</span>
      </Label>
      
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input id="address-autocomplete" placeholder="Start typing your address..." value={inputValue} onChange={handleInputChange} className="w-full pr-10" required aria-required="true" />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0 w-full bg-white">
            <Command>
              <CommandList>
                <CommandGroup heading="Suggestions">
                  {suggestions.map(suggestion => <CommandItem key={suggestion.place_id} onSelect={() => handleAddressSelect(suggestion)} className="flex items-center gap-2 py-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{suggestion.structured_formatting.main_text}</p>
                        <p className="text-sm text-muted-foreground">{suggestion.structured_formatting.secondary_text}</p>
                      </div>
                    </CommandItem>)}
                </CommandGroup>
                <CommandGroup>
                  <CommandItem onSelect={handleManualEntry} className="text-primary">
                    Enter address manually
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      {!open && !shouldShowManualEntry && inputValue.length >= 3 && suggestions.length === 0 && !isLoading && <div className="text-sm">
          <span className="text-muted-foreground">Your address doesn't appear? </span>
          <Button variant="link" className="p-0 h-auto text-primary" onClick={handleManualEntry}>
            Enter manually
          </Button>
        </div>}
      
      {error && <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>}
    </div>;
};