import { useEffect } from 'react';
import Checkbox from '@/Components/Checkbox';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();

        post(route('login'));
    };

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <div className="mb-8">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Se connecter</h2>
                <p className="mt-2 text-sm text-gray-600">Transporteurs, transitaires et administrateurs du port.</p>
            </div>

            {status && <div className="mb-4 font-medium text-sm text-green-600">{status}</div>}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Mot de passe" />
                    <div className="relative">
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <span className="absolute end-4 top-1/2 cursor-pointer -translate-y-1/2" onClick={togglePassword}>
                            {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
                        </span>
                    </div>


                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="block mt-4">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="ms-2 text-sm text-indigo-900">Se souvenir de moi</span>
                    </label>
                </div>

                <div className="flex flex-col items-center justify-end mt-4">

                    <PrimaryButton className="w-full flex justify-center mb-4" disabled={processing}>
                        Se connecter
                    </PrimaryButton>

                    <Link
                        href={route('register')}
                        className="w-full py-1 rounded-md bg-gray-100 border border-gray-600 flex justify-center mb-4" disabled={processing}>
                        Créer un compte transporteur
                    </Link>
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="underline text-sm text-indigo-900 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Mot de passe oublié?
                        </Link>
                    )}
                </div>
            </form>
        </GuestLayout>
    );
}
