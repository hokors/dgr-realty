export function getPublicContactDetails() {
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || '+63 908 896 1940';
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'glenndz_rivera@yahoo.com';
  const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || email;
  const facebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || null;
  const messengerUrl = process.env.NEXT_PUBLIC_MESSENGER_URL?.trim() || null;
  const brokerName = process.env.NEXT_PUBLIC_BROKER_NAME?.trim() || 'Glenndz Rivera';
  const prcLicenseNumber = process.env.NEXT_PUBLIC_PRC_LICENSE_NUMBER?.trim() || null;
  const dhsudRegistrationNumber = process.env.NEXT_PUBLIC_DHSUD_REGISTRATION_NUMBER?.trim() || null;

  return {
    phone,
    phoneHref: phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : null,
    email,
    emailHref: email ? `mailto:${email}` : null,
    privacyEmail,
    privacyEmailHref: `mailto:${privacyEmail}`,
    facebookUrl,
    messengerUrl,
    brokerName,
    prcLicenseNumber,
    dhsudRegistrationNumber,
  };
}
