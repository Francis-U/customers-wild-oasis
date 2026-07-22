"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import { supabase } from "./supabase";
import { getBookings } from "./data-service";
import { redirect } from "next/navigation";

export async function updateGuest(formData) {
  // console.log("server action");
  // console.log(formData);
  const session = await auth();
  if (!session) throw new Error("You must be loggen in");

  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID))
    throw new Error("Please provide a valid national IDB");

  /////we just didnt want to call the updateGuest fn from data-service, so we copied the code here
  const updateData = { nationality, countryFlag, nationalID };

  const { data, error } = await supabase
    .from("guests")
    .update(updateData)
    .eq("id", session.user.guestId);
  if (error) {
    throw new Error("Guest could not be updated");
  }

  revalidatePath("/account/profile");
}

export async function createBooking(bookingData, formData) {
  // console.log(formData);
  ////when using the bind method, make sure the formdata comes in as the second argument

  const session = await auth();
  if (!session) throw new Error("You must be loggen in");

  const newBooking = {
    ...bookingData,
    guestId: session.user.guestId,
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
    extrasPrice: 0,
    totalPrice: bookingData.cabinPrice,
    isPaid: false,
    hasBreakfast: false,
    status: "unconfirmed",
  };
  // console.log(newBooking);

  const { error } = await supabase.from("bookings").insert([newBooking]);
  // So that the newly created object gets returned!
  // .select()
  // .single();

  if (error) {
    throw new Error("Booking could not be created");
  }

  revalidatePath(`/cabins/${bookingData.cabinId}`);
  redirect("/cabins/thankyou");
}

export async function deleteBooking(bookingId) {
  const session = await auth();
  if (!session) throw new Error("You must be loggen in");
  ///to make sure that malicious people cant copy the code from the network and initiate a delete request; people cant delete bookings  of another

  const guestBookings = await getBookings(session.user.guestId); //gets all the bookings of that person
  const guestBookingIds = guestBookings.map((booking) => booking.id); //// this gets all the booking IDs

  if (!guestBookingIds.includes(bookingId)) {
    throw new Error("You are not allowed to delete this booking");
  }

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) throw new Error("Booking could not be deleted");

  revalidatePath("/account/reservations");
}

export async function updateBooking(formData) {
  ////1, Authentication
  const session = await auth();
  if (!session) throw new Error("You must be loggen in");
  ///to make sure that malicious people cant copy the code from the network and initiate a delete request; people cant delete bookings  of another

  ///2, authorization
  const guestBookings = await getBookings(session.user.guestId); //gets all the bookings of that person
  const guestBookingIds = guestBookings.map((booking) => booking.id); //// this gets all the booking IDs
  const bookingId = Number(formData.get("bookingId"));

  if (!guestBookingIds.includes(bookingId)) {
    throw new Error("You are not allowed to update this booking");
  }
  //3 building updateData
  const updateData = {
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
  };

  ///4, mutation
  const { data, error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId)
    .select()
    .single();

  //5, error handling
  if (error) {
    throw new Error("Booking could not be updated");
  }
  ///6. Revalidation
  revalidatePath(`/account/reservations/edit/${bookingId}`);
  //7 redirect
  redirect("/account/reservations");
}

export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
