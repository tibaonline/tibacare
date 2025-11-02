import ProfileForm from './components/ProfileForm';

export default function ProfilePage() {
  // Sample profile data (replace with real data from your backend)
  const profileData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "(123) 456-7890",
    specialty: "General Practitioner"
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <ProfileForm profile={profileData} />
      </div>
    </div>
  );
}
