import type { Employee, RegistrationResult, VisitorFormData } from "../types";
import {
	CREATE_VISITOR_API_URL,
	EMPLOYEE_LOOKUP_API_URL,
	PASS_LOOKUP_API_URL,
	VISITOR_LOOKUP_API_URL,
} from "./ApiUrls";

function normalizeIdProof(proof: unknown) {
	const label = String(proof ?? "");
	if (label === "Aadhar Card") return "Aadhaar Card";
	if (label === "Driving License") return "Driving Licence";
	return label;
}

export async function findEmployeeFromApi(email: string): Promise<Employee | null> {
	const response = await fetch(EMPLOYEE_LOOKUP_API_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email }),
	});
	if (response.status === 404) return null;
	const result = await response.json();
	if (!response.ok) throw new Error(result?.message || `Visitor API returned ${response.status}`);
	if (result?.status !== true || !result.employee) return null;
	return result.employee as Employee;
}

export async function findVisitorFromApi(mobile: string): Promise<Partial<VisitorFormData> | null> {
	const response = await fetch(VISITOR_LOOKUP_API_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ mobile }),
	});
	if (response.status === 404) return null;
	const result = await response.json();
	if (!response.ok) throw new Error(result?.message || `Visitor API returned ${response.status}`);
	if (result?.status !== true || !result.visitor) return null;
	return {
		...result.visitor,
		idProof: normalizeIdProof(result.visitor.idProof),
	} as Partial<VisitorFormData>;
}

export async function findVisitorPassFromApi(passToken: string): Promise<RegistrationResult | null> {
	const response = await fetch(PASS_LOOKUP_API_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token: passToken }),
	});
	if (response.status === 404) return null;
	const result = await response.json();
	if (!response.ok) throw new Error(result?.message || `Visitor API returned ${response.status}`);
	if (result?.status !== true) return null;
	return result as RegistrationResult;
}

export async function submitVisitorToApi(form: VisitorFormData, photoBinary?: Blob | null) {
	const payload = {
		employee: form.employee
			? {
					id: form.employee.id,
					name: form.employee.name,
					email: form.employee.email,
				}
			: null,
		mobile: form.mobile,
		name: form.name,
		company: form.company,
		email: form.email,
		purpose: form.purpose,
		visitorType: form.visitorType,
		validFrom: form.validFrom,
		validTo: form.validTo,
		duration: form.duration,
		visitType: form.visitType,
		idProof: form.idProof,
		idNumber: form.idNumber,
		laptopDetails: form.laptopDetails,
		mobileDetails: form.mobileDetails,
		otherDetails: form.otherDetails,
		badgeId: form.badgeId.trim().toUpperCase(),
	};
	const body = new FormData();
	body.append("payload", JSON.stringify(payload));
	let binaryPhoto = photoBinary;
	if (!binaryPhoto && form.photo) {
		const photoResponse = await fetch(form.photo);
		if (!photoResponse.ok) {
			throw new Error("Unable to read the visitor photo");
		}
		binaryPhoto = await photoResponse.blob();
	}
	if (binaryPhoto) {
		body.append("photo", binaryPhoto, "visitor-photo");
	}

	const response = await fetch(CREATE_VISITOR_API_URL, {
		method: "POST",
		body,
	});
	const result = await response.json();
	if (!response.ok) throw new Error(result?.message || `Visitor API returned ${response.status}`);

	if (result?.status === false) {
		throw new Error(result.message || "Visitor registration failed");
	}

	return {
		...result,
		photo: form.photo,
	};
}
