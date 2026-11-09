import Register from '@/Pages/Auth/Register';

/**
 * La mise à jour d'un dossier rejeté réutilise le parcours d'inscription
 * en 4 étapes, prérempli avec les informations existantes.
 */
export default function Edit(props) {
    return <Register {...props} />;
}
