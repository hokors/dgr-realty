export function getPublicContactDetails() {
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || null;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
  const facebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || null;
  const messengerUrl = process.env.NEXT_PUBLIC_MESSENGER_URL?.trim() || null;

  return {
    phone,
    phoneHref: phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : null,
    email,
    emailHref: email ? `mailto:${email}` : null,
    facebookUrl,
    messengerUrl,
  };
}
