import React from 'react';
import { useParams } from 'react-router-dom';
import ListingWizard from '../components/listing/ListingWizard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import DashboardLayout from '../layouts/DashboardLayout';
export default function PostListingPage() { const { id } = useParams(); useDocumentTitle(id ? 'Edit listing' : 'Create listing'); return <DashboardLayout role="seller"><ListingWizard listingId={id} /></DashboardLayout>; }
