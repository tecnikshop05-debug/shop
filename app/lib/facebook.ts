export type FacebookUserData = {
  em?: string; // Email (hashed)
  ph?: string; // Phone (hashed)
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string; // Click ID
  fbp?: string; // Browser ID
  fn?: string; // First Name (hashed)
  ln?: string; // Last Name (hashed)
  ct?: string; // City (hashed)
  st?: string; // State (hashed)
  country?: string; // Country (hashed)
};

export type FacebookCustomData = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  num_items?: number;
  order_id?: string;
  [key: string]: any;
};

export type FacebookEvent = {
  event_name: string;
  event_time: number;
  action_source:
    | 'website'
    | 'email'
    | 'app'
    | 'phone_call'
    | 'chat'
    | 'physical_store'
    | 'system_generated'
    | 'other';
  user_data: FacebookUserData;
  custom_data?: FacebookCustomData;
  event_source_url?: string;
};

/**
 * Función para hashear datos según requerimientos de Facebook (SHA256)
 * Utiliza Web Crypto API para compatibilidad con Cloudflare Workers/Oxygen
 */
export async function hashData(data: string): Promise<string> {
  if (!data) return '';

  const msgBuffer = new TextEncoder().encode(data.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
}

/**
 * Envía un evento a la API de Conversiones de Facebook
 */
export async function sendFacebookEvent(
  env: Env,
  event: Omit<FacebookEvent, 'event_time' | 'action_source'> & {
    action_source?: FacebookEvent['action_source'];
  },
) {
  const pixelId = env.FACEBOOK_PIXEL_ID;
  const accessToken = env.FACEBOOK_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn('Facebook Pixel ID or Access Token not configured');
    return null;
  }

  const payload = {
    data: [
      {
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        ...event,
      },
    ],
    // test_event_code: 'TEST1234', // Descomentar para probar en el administrador de eventos
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Facebook CAPI Error:', JSON.stringify(data, null, 2));
    } else {
      console.log('Facebook CAPI Success:', event.event_name);
    }

    return data;
  } catch (error) {
    console.error('Facebook CAPI Exception:', error);
    return null;
  }
}
