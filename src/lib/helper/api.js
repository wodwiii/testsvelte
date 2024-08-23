// @ts-ignore
export async function post(endpoint, data) {
  try {
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
      });

      if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
  } catch (error) {
      console.error('Error in POST request:', error);
      throw error;
  }
}

// @ts-ignore
export async function get(endpoint) {
  try {
      const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
          },
      });

      if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
  } catch (error) {
      console.error('Error in GET request:', error);
      throw error;
  }
}
