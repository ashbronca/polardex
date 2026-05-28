import { useEffect, useState } from 'react';
import { AttributeModel } from './attributesModel';
import { supabase } from '../../../services/supabase.config';

export function useGetAttributesQuery() {
  const [attributes, setAttributes] = useState<AttributeModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error: err } = await supabase.from('attributes').select('*');

      if (err) {
        console.error('Error fetching attributes', err);
        setError('Error fetching data');
      } else {
        setAttributes((data ?? []) as AttributeModel[]);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return {
    attributes: loading || error ? [] : attributes,
    loading,
    error: error || null,
  };
}
