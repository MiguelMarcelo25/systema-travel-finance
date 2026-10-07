// Agency-supplied checklist transcribed from the client's requirements photo.
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const visaRequirements = [
  { id: 'visa-form', title: 'Visa application form', detail: 'Typewritten or computerized. Upload a completed copy.' },
  { id: 'passport-photos', title: 'Two passport-size pictures', detail: 'Prepare two passport-size pictures. You can upload each picture separately.' },
  { id: 'passport-bio', title: 'Passport bio-page photocopy', detail: 'Upload a clear copy of the passport page containing your personal details.' },
  { id: 'signed-passport', title: 'Original passport with signature', detail: 'Upload a copy for review and arrange delivery of the signed original.', original: true },
  { id: 'employment', title: 'Certificate of employment', detail: 'Must include date of hiring, position, and monthly compensation. Prepare the original.', original: true },
  { id: 'bank', title: 'Bank certificate and statements', detail: 'Original bank certificate with six months’ average daily balance (ADB), plus three months of bank statements. The BDO alternative below may apply.', original: true },
  { id: 'itr', title: 'Latest income tax return (ITR)', detail: 'Photocopy of the latest ITR. See the explanation letter and BDO alternative if applicable.' },
  { id: 'guarantee', title: 'Letter of guarantee', detail: 'For a spouse, child, or children supported by a spouse or father.', conditional: true },
  { id: 'itr-explanation', title: 'Explanation for non-submission of ITR', detail: 'Provide a letter of explanation if there is no ITR.', conditional: true },
  { id: 'prc', title: 'PRC ID photocopy', detail: 'Submit if you have a PRC ID.', conditional: true },
  { id: 'ibp', title: 'IBP ID photocopy', detail: 'For lawyers.', conditional: true },
  { id: 'bdo', title: 'BDO Elite or Platinum credit card alternative', detail: 'Photocopy of the qualifying BDO credit card and three months of credit card statements. The supplied checklist says bank documents and ITR are not needed for this alternative; confirm applicability with the agency.', conditional: true }
];
