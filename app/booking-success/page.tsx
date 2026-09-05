"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Confirmation = { booking:{ id:string;name:string;service:string;amount:number;currency:string;status:string;createdAt:string }; astrologer:{ name:string;phone:string } };

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");
  const [data,setData]=useState<Confirmation|null>(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    const bookingId=searchParams.get("booking");
    if(!bookingId){setError("Booking reference is missing.");return;}
    fetch("/api/bookings/"+encodeURIComponent(bookingId))
      .then(async res=>{const body=await res.json();if(!res.ok) throw new Error(body.error||"Unable to load booking.");setData(body);})
      .catch(err=>setError(err instanceof Error?err.message:"Unable to load booking."));
  },[searchParams]);

  if(error) return <main className="confirmation-page"><div className="confirmation-card"><h1>Booking confirmation unavailable</h1><p>{error}</p><a className="btn-primary" href="/">Back to home</a></div></main>;
  if(!data) return <main className="confirmation-page"><div className="confirmation-card"><p>Loading your secure booking confirmation…</p></div></main>;

  const callHref="tel:"+data.astrologer.phone;
  const whatsappNumber=data.astrologer.phone.replace(/\D/g,"");
  const whatsappText=encodeURIComponent("Hello "+data.astrologer.name+", I have booked a "+data.booking.service+" session with Nakshatra Readings. My booking reference is "+data.booking.id+".");
  const whatsappHref="https://wa.me/"+whatsappNumber+"?text="+whatsappText;

  return <main className="confirmation-page"><div className="confirmation-card">
    <div className="confirmation-icon">✓</div>
    <p className="confirmation-eyebrow">PAYMENT SUCCESSFUL</p>
    <h1>Your booking is confirmed</h1>
    <p className="confirmation-intro">Thank you, {data.booking.name}. Your payment has been verified successfully.</p>
    <div className="confirmation-details">
      <div><span>Booking reference</span><strong>{data.booking.id}</strong></div>
      <div><span>Service</span><strong>{data.booking.service}</strong></div>
      <div><span>Amount paid</span><strong>₹{data.booking.amount.toFixed(2)}</strong></div>
      <div><span>Status</span><strong className="confirmed">Confirmed</strong></div>
    </div>
    <div className="astrologer-contact">
      <p className="confirmation-eyebrow">YOUR CONSULTATION</p><h2>Contact your astrologer</h2>
      <p>You can call or WhatsApp to schedule your consultation.</p>
      <div className="astrologer-name">{data.astrologer.name}</div>
      <a className="contact-phone" href={callHref}>{data.astrologer.phone}</a>
      <div className="contact-actions"><a className="btn-primary" href={callHref}>Call astrologer</a><a className="btn-ghost" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a></div>
    </div>
    <p className="confirmation-note">Please keep your booking reference for your records.</p>
  </div></main>;
}