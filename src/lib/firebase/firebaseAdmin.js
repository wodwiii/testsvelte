import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
        {
            projectId: import.meta.env.VITE_PROJECTID,
            privateKey: import.meta.env.VITE_PRIVATEKEY.replace(/\\n/g, '\n'),
            clientEmail: import.meta.env.VITE_CLIENTEMAIL,
        }
    ),
    databaseURL: import.meta.env.VITE_DATABASEURL
  });
}

export const db = admin.database();
