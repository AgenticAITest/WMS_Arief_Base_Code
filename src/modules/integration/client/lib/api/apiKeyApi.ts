import axios from 'axios';
import { 
  ApiKey, 
  ApiKeyFormData, 
  ApiKeyListResponse, 
  ApiKeyResponse, 
  ApiKeyQueryParams 
} from '../../schemas/apiKeySchema';

const BASE_URL = '/api/modules/integration/api-keys';

export const apiKeyApi = {
  // Get all integration inbound API keys with pagination and filtering
  getApiKeys: async (params: ApiKeyQueryParams = {}): Promise<ApiKeyListResponse> => {
    const response = await axios.get<ApiKeyListResponse>(BASE_URL, { params });
    return response.data;
  },

  // Get integration inbound API key by ID
  getApiKey: async (id: string): Promise<ApiKeyResponse> => {
    const response = await axios.get<ApiKeyResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Create new integration inbound API key
  createApiKey: async (data: ApiKeyFormData): Promise<ApiKeyResponse> => {
    const response = await axios.post<ApiKeyResponse>(BASE_URL, data);
    return response.data;
  },

  // Update integration inbound API key
  updateApiKey: async (id: string, data: ApiKeyFormData): Promise<ApiKeyResponse> => {
    const response = await axios.put<ApiKeyResponse>(`${BASE_URL}/${id}`, { ...data, id });
    return response.data;
  },

  // Delete integration inbound API key
  deleteApiKey: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`${BASE_URL}/${id}`);
    return response.data;
  },
};