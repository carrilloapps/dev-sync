import { doctor, printDoctor } from '../config/doctor.js';

export type DoctorOptions = {
	json?: boolean;
	cwd?: string;
};

export async function doctorCommand(options: DoctorOptions): Promise<void> {
	const cwd = options.cwd || process.cwd();

	try {
		const result = await doctor({ cwd, json: options.json });

		if (options.json) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			console.log(printDoctor(result));
		}
	} catch (error) {
		if (options.json) {
			console.log(JSON.stringify({ error: String(error) }, null, 2));
		} else {
			console.error(`Doctor failed: ${error}`);
		}

		process.exit(1);
	}
}
