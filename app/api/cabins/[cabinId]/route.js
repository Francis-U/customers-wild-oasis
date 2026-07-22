import { getBookedDatesByCabinId, getCabin } from "@/app/_lib/data-service";

export async function GET(request, { params }) {
  // console.log(request);
  // console.log(params);
  ////generating our own endpoint is good because it keeps us from
  ////exposing the supabase endpoints to a 3rd party, incase a 3rd party wants to cosume our data
  const { cabinId } = params;

  try {
    const [cabin, bookedDates] = await Promise.all([
      getCabin(cabinId),
      getBookedDatesByCabinId(cabinId),
    ]);
    return Response.json({ cabin, bookedDates });
  } catch {
    // console.log(error.message);
    return Response.json({ message: "Cabin not found" });
  }
}
